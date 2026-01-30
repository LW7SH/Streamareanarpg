// UI layer: standardized list rendering for tabs (no fetching, no state mutation)
const UIListRenderer = {
  /**
   * Render a collection into a container, respecting the global grid/list view.
   * Options:
   * - emptyIcon, emptyText
   * - card: (item, idx) => html
   * - row: (item, idx) => html
   * - decorateCard: (html, item, idx) => html
   * - decorateRow: (html, item, idx) => html
   * - listClassName: override for list view (default 'items-list')
   * - gridClassName: override for grid view (default 'items-grid')
   */
  render(containerId, items, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`❌ ${containerId} not found in DOM`);
      return;
    }

    const emptyIcon = options.emptyIcon ?? '📦';
    const emptyText = options.emptyText ?? 'No items to display';

    if (!items || items.length === 0) {
      container.className = options.emptyClassName || '';
      container.innerHTML = UIComponents.renderEmptyState(emptyIcon, emptyText);
      return;
    }

    const isGrid = (State.currentView === 'grid');
    const gridClassName = options.gridClassName || 'items-grid';
    const listClassName = options.listClassName || 'items-list';

    const cardFn = options.card || ((item, idx) => UIComponents.renderItemCard(item, idx, false));
    const rowFn  = options.row  || ((item, idx) => UIComponents.renderItemRow(item, idx, false, null));

    const decorateCard = options.decorateCard || ((html) => html);
    const decorateRow  = options.decorateRow  || ((html) => html);

    container.className = isGrid ? gridClassName : listClassName;

    const html = items.map((item, idx) => {
      const base = isGrid ? cardFn(item, idx) : rowFn(item, idx);
      return isGrid ? decorateCard(base, item, idx) : decorateRow(base, item, idx);
    }).join('');

    container.innerHTML = html;
  }
};
