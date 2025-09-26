import React, { useState } from 'react';
import { useModel } from 'react-doura';
import { appStateModel, appStateModelName } from '../modules/state-manager';
import './stocks.css';

export default function Stocks() {
  const { setCurrentView, stocks, addStock, updateStock, removeStock, fetchStockInfos } = useModel(
    appStateModelName,
    appStateModel
  );
  const [form, setForm] = useState({ symbol: '' });
  const [editIndex, setEditIndex] = useState(null);

  const handleAdd = e => {
    e.preventDefault();
    if (!form.symbol.trim()) return;
    fetchStockInfos([form.symbol.trim()]);
    setForm({ symbol: '' });
  };

  const handleEdit = idx => {
    setEditIndex(idx);
  };

  const handleCancel = () => {
    setEditIndex(null);
  };

  const handleDelete = symbol => {
    removeStock(symbol);
  };

  return (
    <div className="stocks-container">
      <div className="stocks-header">
        <h3>Stocks</h3>
        <button onClick={() => setCurrentView('main')} className="close-btn">
          ×
        </button>
      </div>
      <div className="stocks-list-wrapper">
        <div className="stocks-list-title">Stock List</div>
        <form className="stocks-form">
          <input
            className="stocks-input"
            placeholder="Symbol"
            value={form.symbol}
            onChange={e => setForm(f => ({ ...f, symbol: e.target.value }))}
            required
          />
          <button onClick={handleAdd} className="stocks-add-btn" type="button">
            Add
          </button>
        </form>
        {stocks.length === 0 ? (
          <p className="stocks-empty">No stocks added yet.</p>
        ) : (
          <div className="stocks-list">
            {stocks.map((stock, idx) => (
              <div className="stock-card" key={stock.symbol}>
                <div className="stock-fields">
                  <span>
                    <span className="stock-symbol">{stock.symbol}</span>
                    <span className="stock-shortname"> ({stock.shortName})</span>
                  </span>
                </div>
                {editIndex === idx ? (
                  <div className="stock-actions">
                    price:
                    <input
                      className="stocks-input"
                      type="number"
                      value={stock.currentPrice}
                      onChange={e => updateStock(stock.symbol, { currentPrice: e.target.value })}
                    />
                    <button className="stocks-cancel-btn" onClick={handleCancel}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="stock-actions">
                    price:<span className="stock-price">{stock.currentPrice}</span>
                    <button className="stocks-edit-btn" onClick={() => handleEdit(idx)}>
                      Edit
                    </button>
                    <button
                      className="stocks-delete-btn"
                      onClick={() => handleDelete(stock.symbol)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

