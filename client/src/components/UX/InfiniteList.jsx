import React from 'react';

export default function InfiniteList({ items, renderItem, loadMore, hasMore }) {
  // Very small scaffold: calls loadMore when user scrolls near bottom.
  React.useEffect(() => {
    function onScroll() {
      try {
        const bottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 200;
        if (bottom && hasMore) loadMore && loadMore();
      } catch (e) {}
    }
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [hasMore, loadMore]);

  return <div>{(items || []).map((it, i) => renderItem(it, i))}</div>;
}
