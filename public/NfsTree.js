import {render, html, svg} from './vendor/lighterhtml.js';

class NfsTree extends HTMLElement {

  /**
   * Handles the construction of this HTML element.
   */
  constructor() {
    super();
    this.handle = null;
    this.slices = [];
    this.showHiddenFiles = false;
    window.addEventListener('keydown', event => {
      if (event.key === '.' && event.metaKey) {
        event.preventDefault();
        this.showHiddenFiles = !this.showHiddenFiles;
        this.draw();
      }
    });
  }

  /**
   * Renders the initial markup.
   */
  connectedCallback () {
    this.setAttribute('handle', 'empty');
    this.draw()
  }

  /**
   * The method to (re)render the element via lighterHTML.
   */
  draw () {
    this.dataset.depth = this.slices.length.toString();
    render(this, html`
    
    ${ 
      this.handle ?
        html`<div class="inner">
            ${this.slices.map((slice, sliceIndex) => this.folderList(slice, sliceIndex))}
        </div>` : ''
    }
    <button class="select-folder" onclick="${() => this.showFolderDialog()}">${folderIcon}</button>
    `)
  }

  /**
   * Fetches the tree structure
   * @param handle
   * @returns {Promise<[]>}
   */
  async getChildren (handle) {
    let branch = [];
    for await (const entry of handle.getEntries()) {
      branch.push({
        handle: entry,
      });
    }

    branch.sort((a, b) => {
      let aName = a.handle.name.toLowerCase();
      let bName = b.handle.name.toLowerCase();

      let aType = a.handle.isDirectory;
      let bType = b.handle.isDirectory;

      if (aType > bType) { return -1; }
      if (aType < bType) { return 1; }

      if (aName < bName) { return -1; }
      if (aName > bName) { return 1; }
      return 0;
    });

    return branch;
  }

  /**
   * A lighterHTML template
   * @param slice
   * @param sliceIndex
   * @returns {Hole}
   */
  folderList (slice, sliceIndex) {
    let shouldBeRemoved = false;

    for (let i = sliceIndex; i > 0; i--) {
      if (this.slices[i - 1] && this.slices[i - 1].some(leaf => leaf.remove)) {
        shouldBeRemoved = true;
      }
    }

    let header = this.slices[sliceIndex - 1] ? this.slices[sliceIndex - 1].find(leaf => leaf.active) : false;
    let backTitle = header ? header.handle.name : this.handle.name;

    let backButton = html`
    <li class="back">
        <span class="title">
            ${backTitle}
            ${sliceIndex > 0 ? html`<span onclick="${() => this.closeSlice(sliceIndex)}" class="arrow">◀</span>` : ''}
        </span>
    </li>`;

    return html`
      <ul class="list ${shouldBeRemoved ? 'remove' : ''}">
        ${backButton}
        ${slice.filter(leaf => !(!this.showHiddenFiles && leaf.handle.name.substr(0, 1) === '.')).map(leaf => html`
          <li class="item ${leaf.handle.isDirectory ? 'directory' : 'file'} ${leaf.active ? 'active' : ''}" 
          onclick="${() => this.toggleActive(leaf, sliceIndex + 1)}">
            <span class="title">
              <span class="inner-title">${leaf.handle.name}</span>
              ${leaf.handle.isDirectory ? html`<span class="arrow">▶</span>` : ''}
            </span>
          </li>
        `)}
      </ul>`
  }

  /**
   * Removes a slide, eg. closes a folder
   * @param index
   */
  closeSlice (index) {
    this.slices[index - 1][0].remove = true;
    this.draw();
    setTimeout(() => {
      this.slices.splice(index);
      delete this.slices[index - 1][0].remove;
      this.slices[index - 1].forEach(leaf => delete leaf.active);
      this.draw();
    }, 350);
  }

  /**
   * Makes a leaf active and fetcher the leafs children.
   * @param leaf
   * @param index
   * @returns {Promise<void>}
   */
  async toggleActive (leaf, index) {
    let continueFlow = async () => {
      delete leaf.remove;
      this.slices.splice(index);
      if (leaf.handle.isDirectory && !leaf.active) this.slices[index] = await this.getChildren(leaf.handle);
      this.slices[index - 1].forEach(innerLeaf => innerLeaf !== leaf ? innerLeaf.active = false : false);
      leaf.active = !leaf.active;
      this.draw();

      if (leaf.handle.isFile) {
        this.dispatchEvent(new CustomEvent('select', {
          detail: leaf.handle
        }));
      }
    };

    if (this.slices[index - 1].some(innerLeaf => innerLeaf.active && innerLeaf.handle.isDirectory)) {
      leaf.remove = true;
      this.draw();
      setTimeout(continueFlow, 350)
    }
    else {
      await continueFlow();
    }
  }

  /**
   * Shows the OS folder dialog.
   */
  showFolderDialog () {
    window.chooseFileSystemEntries({
      type: 'openDirectory',
      readOnly: false,
    }).then(handle => {
      this.handle = handle;
      this.draw();
      this.getChildren(handle)
      .then(children => {
        this.slices = [children];
        this.setAttribute('handle', 'filled');
        this.draw();
      });
    })
    .catch(exception => {
      this.handle = null;
      this.setAttribute('handle', 'empty');
      this.draw();
    })
  }

}

const folderIcon = svg`<svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0" y="0" width="45" height="45" viewBox="0 0 45 45" xml:space="preserve"><path d="M44.5 13.4c-0.5-0.6-1.2-0.9-1.9-0.9H40c0-1.4-1.1-2.5-2.5-2.5H30c-1.4 0-2.5 1.1-2.5 2.5h-15c-1.2 0-2.2 0.8-2.4 2 0 0-5.1 22.9-5.1 23H2.5v-30H35C35 6.1 33.9 5 32.5 5h-30C1.1 5 0 6.1 0 7.5v30C0 38.9 1.1 40 2.5 40h5 25 5c1.2 0 2.2-0.8 2.4-2l5-22.5C45.1 14.8 44.9 14 44.5 13.4zM37.3 20.8h-2.4v2.4c0 0.7-0.5 1.2-1.2 1.2s-1.2-0.5-1.2-1.2v-2.4h-2.4c-0.7 0-1.2-0.5-1.2-1.2 0-0.7 0.5-1.2 1.2-1.2h2.4v-2.4c0-0.7 0.5-1.2 1.2-1.2s1.2 0.5 1.2 1.2v2.4h2.4c0.7 0 1.2 0.5 1.2 1.2C38.5 20.2 38 20.8 37.3 20.8z"/></svg>`;

customElements.define('nfs-tree', NfsTree);