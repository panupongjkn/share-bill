'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { BillState, Person, Order, SubOrder } from '@/types';
import { decodeState, encodeState } from '@/utils/serialization';
import { calculateTotals } from '@/utils/calculations';

const initialState: BillState = {
  people: [],
  orders: [],
  tax: 0,
  serviceCharge: 0
};

type ModalState = 
  | { type: 'person' } 
  | { type: 'order' } 
  | { type: 'edit-order', id: string }
  | { type: 'sub-order', orderId: string } 
  | { type: 'edit-sub-order', orderId: string, id: string }
  | { type: 'confirm-delete', target: 'person' | 'order' | 'sub-order', id: string, orderId?: string, name: string }
  | null;

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2m-6 9h4m-4-4h4" />
  </svg>
);

const EditIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const UpIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="18 15 12 9 6 15"></polyline>
  </svg>
);

const DownIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

const WarningIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
    <line x1="12" y1="9" x2="12" y2="13"></line>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
);

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BillApp />
    </Suspense>
  );
}

function BillApp() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<BillState>(initialState);
  const [isLoaded, setIsLoaded] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);
  
  // Modal Input States
  const [modalName, setModalName] = useState('');
  const [modalPrice, setModalPrice] = useState('');

  const modalInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const s = searchParams.get('s');
    if (s) {
      const decoded = decodeState(s);
      if (decoded) setState(decoded);
    }
    setIsLoaded(true);
  }, [searchParams]);

  useEffect(() => {
    if (!isLoaded) return;
    const encoded = encodeState(state);
    const params = new URLSearchParams(window.location.search);
    params.set('s', encoded);
    window.history.replaceState(null, '', `?${params.toString()}`);
  }, [state, isLoaded]);

  // Focus Modal Input
  useEffect(() => {
    if (modal && (modal.type === 'person' || modal.type === 'order' || modal.type === 'sub-order' || modal.type === 'edit-order' || modal.type === 'edit-sub-order')) {
      setTimeout(() => modalInputRef.current?.focus(), 0);
    }
  }, [modal]);

  const openModal = useCallback((m: ModalState) => {
    if (m?.type === 'edit-order') {
      const order = state.orders.find(o => o.id === m.id);
      setModalName(order?.name || '');
      setModalPrice('');
    } else if (m?.type === 'edit-sub-order') {
      const order = state.orders.find(o => o.id === m.orderId);
      const sub = order?.subOrders.find(so => so.id === m.id);
      setModalName(sub?.name || '');
      setModalPrice(sub?.price.toString() || '');
    } else {
      setModalName('');
      setModalPrice('');
    }
    setModal(m);
  }, [state.orders]);

  const closeModal = useCallback(() => {
    setModal(null);
    setModalName('');
    setModalPrice('');
  }, []);

  const totals = useMemo(() => calculateTotals(state), [state]);

  const addPerson = useCallback((name: string) => {
    if (!name.trim()) return;
    const newPerson: Person = { id: crypto.randomUUID(), name: name.trim() };
    setState(prev => ({ ...prev, people: [...prev.people, newPerson] }));
    closeModal();
  }, [closeModal]);

  const removePerson = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      people: prev.people.filter(p => p.id !== id),
      orders: prev.orders.map(o => ({
        ...o,
        subOrders: o.subOrders.map(so => ({
          ...so,
          personIds: so.personIds.filter(pid => pid !== id)
        }))
      }))
    }));
    closeModal();
  }, [closeModal]);

  const addOrder = useCallback((name: string) => {
    if (!name.trim()) return;
    const newOrder: Order = { id: crypto.randomUUID(), name: name.trim(), subOrders: [] };
    setState(prev => ({ ...prev, orders: [...prev.orders, newOrder] }));
    closeModal();
  }, [closeModal]);

  const updateOrder = useCallback((id: string, name: string) => {
    setState(prev => ({
      ...prev,
      orders: prev.orders.map(o => o.id === id ? { ...o, name: name.trim() } : o)
    }));
    closeModal();
  }, [closeModal]);

  const removeOrder = useCallback((id: string) => {
    setState(prev => ({ ...prev, orders: prev.orders.filter(o => o.id !== id) }));
    closeModal();
  }, [closeModal]);

  const moveOrder = useCallback((id: string, direction: 'up' | 'down') => {
    setState(prev => {
      const index = prev.orders.findIndex(o => o.id === id);
      if (index === -1) return prev;
      if (direction === 'up' && index === 0) return prev;
      if (direction === 'down' && index === prev.orders.length - 1) return prev;

      const newOrders = [...prev.orders];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      [newOrders[index], newOrders[targetIndex]] = [newOrders[targetIndex], newOrders[index]];
      
      return { ...prev, orders: newOrders };
    });
  }, []);

  const addSubOrder = useCallback((orderId: string, name: string, price: number) => {
    setState(prev => ({
      ...prev,
      orders: prev.orders.map(o => {
        if (o.id !== orderId) return o;
        const newSub: SubOrder = {
          id: crypto.randomUUID(),
          name: name.trim() || 'New Item',
          price: price || 0,
          personIds: []
        };
        return { ...o, subOrders: [...o.subOrders, newSub] };
      })
    }));
    closeModal();
  }, [closeModal]);

  const updateSubOrder = useCallback((orderId: string, subId: string, name: string, price: number) => {
    setState(prev => ({
      ...prev,
      orders: prev.orders.map(o => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          subOrders: o.subOrders.map(so => (so.id === subId ? { ...so, name: name.trim(), price } : so))
        };
      })
    }));
    closeModal();
  }, [closeModal]);

  const removeSubOrder = useCallback((orderId: string, subId: string) => {
    setState(prev => ({
      ...prev,
      orders: prev.orders.map(o => {
        if (o.id !== orderId) return o;
        return { ...o, subOrders: o.subOrders.filter(so => so.id !== subId) };
      })
    }));
    closeModal();
  }, [closeModal]);

  const moveSubOrder = useCallback((orderId: string, subId: string, direction: 'up' | 'down') => {
    setState(prev => ({
      ...prev,
      orders: prev.orders.map(o => {
        if (o.id !== orderId) return o;
        const index = o.subOrders.findIndex(so => so.id === subId);
        if (index === -1) return o;
        if (direction === 'up' && index === 0) return o;
        if (direction === 'down' && index === o.subOrders.length - 1) return o;

        const newSubOrders = [...o.subOrders];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        [newSubOrders[index], newSubOrders[targetIndex]] = [newSubOrders[targetIndex], newSubOrders[index]];
        
        return { ...o, subOrders: newSubOrders };
      })
    }));
  }, []);

  const togglePersonInSubOrder = useCallback((orderId: string, subId: string, personId: string) => {
    setState(prev => ({
      ...prev,
      orders: prev.orders.map(o => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          subOrders: o.subOrders.map(so => {
            if (so.id !== subId) return so;
            const personIds = so.personIds.includes(personId)
              ? so.personIds.filter(id => id !== personId)
              : [...so.personIds, personId];
            return { ...so, personIds };
          })
        };
      })
    }));
  }, []);

  if (!isLoaded) return <div>Loading...</div>;

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modal || !modalName.trim()) return;
    
    if (modal.type === 'person') {
      addPerson(modalName);
    } else if (modal.type === 'order') {
      addOrder(modalName);
    } else if (modal.type === 'edit-order') {
      updateOrder(modal.id, modalName);
    } else if (modal.type === 'sub-order') {
      const price = parseFloat(modalPrice || '0');
      addSubOrder(modal.orderId, modalName, price);
    } else if (modal.type === 'edit-sub-order') {
      const price = parseFloat(modalPrice || '0');
      updateSubOrder(modal.orderId, modal.id, modalName, price);
    } else if (modal.type === 'confirm-delete') {
      if (modal.target === 'person') removePerson(modal.id);
      else if (modal.target === 'order') removeOrder(modal.id);
      else if (modal.target === 'sub-order' && modal.orderId) removeSubOrder(modal.orderId, modal.id);
    }
  };

  const isSubmitDisabled = modal?.type !== 'confirm-delete' && (!modalName.trim() || ((modal?.type === 'sub-order' || modal?.type === 'edit-sub-order') && !modalPrice.trim()));

  return (
    <main style={{ maxWidth: '95%' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: '0.5rem' }}>Share bill</h1>
        <p style={{ color: 'var(--secondary)', fontWeight: '500' }}>Share bill with your friends</p>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            {modal.type === 'confirm-delete' ? (
              <React.Fragment>
                <h3 style={{ color: '#d73a49' }}>Confirm Delete</h3>
                <p style={{ marginBottom: '1.5rem' }}>
                  Are you sure you want to remove <strong>{modal.name}</strong>? This action cannot be undone.
                </p>
                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={closeModal}>Cancel</button>
                  <button type="button" className="btn-primary" style={{ background: '#dc3545' }} onClick={handleModalSubmit}>
                    Confirm Delete
                  </button>
                </div>
              </React.Fragment>
            ) : (
              <React.Fragment>
                <h3>
                  {modal.type === 'person' && 'Add Person'}
                  {modal.type === 'order' && 'Add New Order'}
                  {modal.type === 'edit-order' && 'Edit Order'}
                  {modal.type === 'sub-order' && 'Add Item'}
                  {modal.type === 'edit-sub-order' && 'Edit Item'}
                </h3>
                <form onSubmit={handleModalSubmit}>
                  <div className="flex-col">
                    <input 
                      ref={modalInputRef}
                      type="text" 
                      value={modalName}
                      onChange={(e) => setModalName(e.target.value)}
                      placeholder={
                        modal.type === 'person' ? 'Enter name' : 
                        (modal.type === 'order' || modal.type === 'edit-order') ? 'Enter order name (e.g., Dinner)' :
                        'Item name'
                      }
                    />
                    {(modal.type === 'sub-order' || modal.type === 'edit-sub-order') && (
                      <input 
                        type="number" 
                        step="0.01"
                        value={modalPrice}
                        onChange={(e) => setModalPrice(e.target.value)}
                        placeholder="Price"
                      />
                    )}
                  </div>
                  <div className="modal-actions">
                    <button type="button" className="btn-secondary" onClick={closeModal}>Cancel</button>
                    <button 
                      type="submit" 
                      className="btn-primary" 
                      disabled={isSubmitDisabled}
                      style={{ opacity: isSubmitDisabled ? 0.5 : 1, cursor: isSubmitDisabled ? 'not-allowed' : 'pointer' }}
                    >
                      {modal.type.startsWith('edit') ? 'Update' : 'Add'}
                    </button>
                  </div>
                </form>
              </React.Fragment>
            )}
          </div>
        </div>
      )}
      
      <section className="card">
        <div className="flex-row flex-row-mobile-stack" style={{ justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2>Bill Details</h2>
          <div className="flex-row">
            <button className="btn-secondary" onClick={() => openModal({ type: 'person' })}>+ Add Person</button>
            <button className="btn-primary" onClick={() => openModal({ type: 'order' })}>+ Add Order</button>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="table-container desktop-only">
          <table>
            <thead>
              {state.people.length > 0 ? (
                <React.Fragment>
                  <tr>
                    <th rowSpan={2} className="col-item">Order / Item Name</th>
                    <th rowSpan={2} className="col-price">Price</th>
                    <th colSpan={state.people.length} className="people-group-header">Participants</th>
                    <th rowSpan={2} className="col-action">Action</th>
                  </tr>
                  <tr>
                    {state.people.map(p => (
                      <th key={p.id} className="col-person">
                        <div className="flex-row" style={{ justifyContent: 'center', gap: '4px' }}>
                          <span style={{ whiteSpace: 'nowrap' }}>{p.name}</span>
                          <button 
                            className="btn-icon"
                            onClick={() => openModal({ type: 'confirm-delete', target: 'person', id: p.id, name: p.name })}
                            title="Remove person"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </React.Fragment>
              ) : (
                <tr>
                  <th className="col-item">Order / Item Name</th>
                  <th className="col-price">Price</th>
                  <th className="col-action">Action</th>
                </tr>
              )}
            </thead>
            <tbody>
              {state.orders.length === 0 && (
                <tr>
                  <td colSpan={3 + state.people.length} style={{ textAlign: 'center', color: '#999' }}>No orders added yet.</td>
                </tr>
              )}
              {state.orders.map((order, orderIndex) => {
                const orderTotal = order.subOrders.reduce((sum, so) => sum + so.price, 0);
                const isOrderIncomplete = order.subOrders.some(so => so.personIds.length === 0);
                return (
                  <React.Fragment key={order.id}>
                    <tr className="order-group-row">
                      <td>
                        <div className="flex-col" style={{ gap: 0 }}>
                          <span style={{ fontWeight: 700 }}>{order.name}</span>
                          {isOrderIncomplete && (
                            <div className="unassigned-warning" style={{ marginLeft: '0.25rem' }}>
                              <WarningIcon /> Not complete
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="order-total-cell">{orderTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      {state.people.map(p => <td key={p.id}></td>)}
                      <td className="col-action">
                        <div className="flex-row" style={{ justifyContent: 'center', gap: '4px' }}>
                          <button className="btn-icon" style={{ color: '#007bff' }} onClick={() => openModal({ type: 'edit-order', id: order.id })} title="Edit order"><EditIcon /></button>
                          <button className="btn-icon" style={{ color: '#6c757d' }} disabled={orderIndex === 0} onClick={() => moveOrder(order.id, 'up')} title="Move up"><UpIcon /></button>
                          <button className="btn-icon" style={{ color: '#6c757d' }} disabled={orderIndex === state.orders.length - 1} onClick={() => moveOrder(order.id, 'down')} title="Move down"><DownIcon /></button>
                          <button className="btn-icon" onClick={() => openModal({ type: 'confirm-delete', target: 'order', id: order.id, name: order.name })} title="Delete order"><TrashIcon /></button>
                        </div>
                      </td>
                    </tr>
                    {order.subOrders.map((sub, subIndex) => {
                      const isUnassigned = sub.personIds.length === 0;
                      return (
                        <tr key={sub.id} className={`sub-order-row ${isUnassigned ? 'unassigned' : ''}`}>
                          <td style={{ paddingLeft: '2rem' }}>
                            <div className="flex-col" style={{ gap: 0 }}>
                              <span>{sub.name}</span>
                              {isUnassigned && (
                                <div className="unassigned-warning">
                                  <WarningIcon /> Not assigned
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="cell-price">{sub.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          {state.people.map(p => (
                            <td key={p.id} className={`check-cell ${sub.personIds.includes(p.id) ? 'active' : ''}`} onClick={() => togglePersonInSubOrder(order.id, sub.id, p.id)}>
                              {sub.personIds.includes(p.id) ? '●' : '○'}
                            </td>
                          ))}
                          <td className="col-action">
                            <div className="flex-row" style={{ justifyContent: 'center', gap: '4px' }}>
                              <button className="btn-icon" style={{ color: '#007bff' }} onClick={() => openModal({ type: 'edit-sub-order', orderId: order.id, id: sub.id })} title="Edit item"><EditIcon /></button>
                              <button className="btn-icon" style={{ color: '#6c757d' }} disabled={subIndex === 0} onClick={() => moveSubOrder(order.id, sub.id, 'up')} title="Move up"><UpIcon /></button>
                              <button className="btn-icon" style={{ color: '#6c757d' }} disabled={subIndex === order.subOrders.length - 1} onClick={() => moveSubOrder(order.id, sub.id, 'down')} title="Move down"><DownIcon /></button>
                              <button className="btn-icon" onClick={() => openModal({ type: 'confirm-delete', target: 'sub-order', id: sub.id, orderId: order.id, name: sub.name })} title="Remove item"><TrashIcon /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    <tr>
                      <td colSpan={3 + state.people.length} style={{ padding: '1.5rem 0.75rem' }}>
                        <button className="btn-secondary" style={{ width: '100%', padding: '0.5rem', fontSize: '0.8rem' }} onClick={() => openModal({ type: 'sub-order', orderId: order.id })}>+ Add Item to {order.name}</button>
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 800, background: '#f8f9fa' }}>
                <td>Subtotal</td>
                <td className="cell-price">{totals.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                {state.people.map(p => {
                  const personSubtotal = state.orders.reduce((sum, o) => {
                    return sum + o.subOrders.reduce((subSum, sub) => {
                      if (sub.personIds.includes(p.id)) {
                        return subSum + (sub.price / sub.personIds.length);
                      }
                      return subSum;
                    }, 0);
                  }, 0);
                  return <td key={p.id} style={{ textAlign: 'center' }}>{personSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>;
                })}
                <td className="col-action"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="mobile-only">
          {state.orders.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>No orders added yet.</div>
          )}
          {state.orders.map((order, orderIndex) => {
            const orderTotal = order.subOrders.reduce((sum, so) => sum + so.price, 0);
            const isOrderIncomplete = order.subOrders.some(so => so.personIds.length === 0);
            return (
              <div key={order.id} className="mobile-order-card">
                <div className="mobile-order-header">
                  <div className="flex-col" style={{ gap: '2px' }}>
                    <div className="flex-row">
                      <strong>{order.name}</strong>
                      <button className="btn-icon" style={{ color: '#007bff' }} onClick={() => openModal({ type: 'edit-order', id: order.id })}><EditIcon /></button>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--secondary)' }}>Total: {orderTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    {isOrderIncomplete && <div className="unassigned-warning"><WarningIcon /> Not complete</div>}
                  </div>
                  <div className="flex-row">
                    <button className="btn-icon" style={{ color: '#6c757d' }} disabled={orderIndex === 0} onClick={() => moveOrder(order.id, 'up')}><UpIcon /></button>
                    <button className="btn-icon" style={{ color: '#6c757d' }} disabled={orderIndex === state.orders.length - 1} onClick={() => moveOrder(order.id, 'down')}><DownIcon /></button>
                    <button className="btn-icon" onClick={() => openModal({ type: 'confirm-delete', target: 'order', id: order.id, name: order.name })}><TrashIcon /></button>
                  </div>
                </div>
                <div>
                  {order.subOrders.map((sub, subIndex) => {
                    const isUnassigned = sub.personIds.length === 0;
                    return (
                      <div key={sub.id} className={`mobile-item-card ${isUnassigned ? 'unassigned' : ''}`}>
                        <div className="mobile-item-header">
                          <div className="flex-col" style={{ gap: '2px' }}>
                            <div className="flex-row">
                              <span>{sub.name}</span>
                              <button className="btn-icon" style={{ color: '#007bff', padding: '2px' }} onClick={() => openModal({ type: 'edit-sub-order', orderId: order.id, id: sub.id })}><EditIcon /></button>
                            </div>
                            <span style={{ fontWeight: 700 }}>{sub.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            {isUnassigned && <div className="unassigned-warning"><WarningIcon /> Not assigned</div>}
                          </div>
                          <div className="flex-row">
                            <button className="btn-icon" style={{ color: '#6c757d', padding: '2px' }} disabled={subIndex === 0} onClick={() => moveSubOrder(order.id, sub.id, 'up')}><UpIcon /></button>
                            <button className="btn-icon" style={{ color: '#6c757d', padding: '2px' }} disabled={subIndex === order.subOrders.length - 1} onClick={() => moveSubOrder(order.id, sub.id, 'down')}><DownIcon /></button>
                            <button className="btn-icon" style={{ padding: '2px' }} onClick={() => openModal({ type: 'confirm-delete', target: 'sub-order', id: sub.id, orderId: order.id, name: sub.name })}><TrashIcon /></button>
                          </div>
                        </div>
                        <div className="mobile-person-grid">
                          {state.people.map(p => (
                            <button 
                              key={p.id}
                              className={`mobile-person-toggle ${sub.personIds.includes(p.id) ? 'active' : ''}`}
                              onClick={() => togglePersonInSubOrder(order.id, sub.id, p.id)}
                            >
                              {p.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  <button className="btn-secondary" style={{ width: '100%', padding: '0.75rem', borderRadius: 0 }} onClick={() => openModal({ type: 'sub-order', orderId: order.id })}>
                    + Add Item
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid-cols-2" style={{ marginTop: '1.5rem' }}>
        <section className="card">
          <h2>Adjustment</h2>
          <div className="grid-cols-2">
            <div>
              <label>Service Charge (%)</label>
              <input 
                type="number" 
                value={state.serviceCharge || 0} 
                onChange={(e) => setState(prev => ({ ...prev, serviceCharge: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <label>Tax (%)</label>
              <input 
                type="number" 
                value={state.tax || 0} 
                onChange={(e) => setState(prev => ({ ...prev, tax: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>
        </section>

        <section className="card">
          <h2>Summary</h2>
          <div className="flex-col">
            {state.people.map(p => (
              <div key={p.id} className="total-row">
                <span>{p.name}</span>
                <span>{totals.personTotals[p.id].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            ))}
            <div className="total-row">
              <span>Total Bill</span>
              <span>{totals.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
          
          <button 
            className="btn-primary" 
            style={{ width: '100%', marginTop: '1rem' }}
            onClick={() => {
              const url = window.location.href;
              navigator.clipboard.writeText(url);
              alert('Link copied to clipboard!');
            }}
          >
            Copy Shareable Link
          </button>
        </section>
      </div>
    </main>
  );
}
