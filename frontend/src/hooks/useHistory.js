import { useState } from 'react';
import { saveToHistory, loadHistory, togglePin as togglePinHistory, deleteFromHistory, clearHistory } from '../lib/history';

export function useHistory() {
  const [historyItems, setHistoryItems] = useState(() => loadHistory());

  const handleSave = (product) => {
    const updated = saveToHistory(product);
    setHistoryItems(updated);
    return updated;
  };

  const handleDelete = (id) => {
    if (id) {
      setHistoryItems(deleteFromHistory(id));
    } else {
      clearHistory();
      setHistoryItems([]);
    }
  };

  const handleTogglePin = (id) => {
    setHistoryItems(togglePinHistory(id));
  };

  return {
    historyItems,
    setHistoryItems,
    handleSave,
    handleDelete,
    handleTogglePin,
  };
}
