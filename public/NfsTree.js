import {render, html, svg} from './vendor/lighterhtml.js';

class NfsTree extends HTMLElement {

  /**
   * Handles the construction of this HTML element.
   */
  constructor() {
    super();
    this.handle = null;
    this.tree = [];
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
    this.setAttribute('deepest-depth', 0);

    render(this, html`
    ${ 
      this.handle ?
        this.template(this.tree) : 
        html`<button onclick="${() => this.showFolderDialog()}">${folderIcon}</button>`
    }`)
  }

  /**
   * Fetches the tree structure
   * @param handle
   * @returns {Promise<[]>}
   */
  async getTreeStructure (handle) {
    let branch = [];
    for await (const entry of handle.getEntries()) {
      branch.push({
        handle: entry,
      });
    }
    return branch;
  }

  /**
   * A lighterHTML template
   * @param tree
   * @param depth
   * @returns {Hole}
   */
  template (tree, depth = 0) {
    let currentDeepestDepth = parseInt(this.getAttribute('deepest-depth')) || 0;

    if (currentDeepestDepth < depth) {
      this.setAttribute('deepest-depth', depth.toString());
    }

    return html`
      <ul class="list">
      ${tree.map(leaf => html`
          <li class="item ${leaf.handle.isDirectory ? 'directory' : 'file'}">
            <span class="title" onclick="${() => this.toggleActive(leaf, tree)}">
              ${leaf.handle.name}
              ${leaf.handle.isDirectory ? html`<span>▶</span>` : ''}
            </span>
            ${leaf.children && leaf.active ? this.template(leaf.children, depth + 1) : ''}
          </li>
      `)}
      </ul>`
  }

  /**
   * Makes a leaf active and fetcher the leafs children.
   * @param leaf
   * @param siblings
   * @returns {Promise<void>}
   */
  async toggleActive (leaf, siblings) {
    siblings.forEach(sibling => {
      if (sibling !== leaf) sibling.active = false
    });
    leaf.active = !leaf.active;
    if (typeof leaf.children === 'undefined') {
      leaf.children = leaf.handle.isDirectory ? await this.getTreeStructure(leaf.handle) : [];
    }
    this.draw();
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
      this.getTreeStructure(handle)
      .then(tree => {
        this.tree = tree;
        this.setAttribute('handle', 'loaded');
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