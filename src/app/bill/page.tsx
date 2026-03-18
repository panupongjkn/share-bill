"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  Suspense,
  useRef,
} from "react";
import { useSearchParams } from "next/navigation";
import { BillState, Person, Order, SubOrder } from "@/types";
import { decodeState, encodeState } from "@/utils/serialization";
import { calculateTotals } from "@/utils/calculations";

const initialState: BillState = {
  people: [],
  orders: [],
};

type ModalState =
  | { type: "person" }
  | { type: "order" }
  | { type: "edit-order"; id: string }
  | { type: "sub-order"; orderId: string }
  | { type: "edit-sub-order"; orderId: string; id: string }
  | {
      type: "confirm-delete";
      target: "person" | "order" | "sub-order";
      id: string;
      orderId?: string;
      name: string;
    }
  | null;

const TrashIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2m-6 9h4m-4-4h4" />
  </svg>
);

const EditIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const UpIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="18 15 12 9 6 15"></polyline>
  </svg>
);

const DownIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

const WarningIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
    <line x1="12" y1="9" x2="12" y2="13"></line>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
);

const ChevronDownIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="6 9 12 15 18 9"></polyline>
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
  const [modalName, setModalName] = useState("");
  const [modalPrice, setModalPrice] = useState("");
  const [modalTax, setModalTax] = useState("");
  const [modalServiceCharge, setModalServiceCharge] = useState("");
  const [modalOrderType, setModalOrderType] = useState<"multiple" | "single">(
    "multiple",
  );

  const modalInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const s = searchParams.get("s");
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
    params.set("s", encoded);
    window.history.replaceState(null, "", `?${params.toString()}`);
  }, [state, isLoaded]);

  // Focus Modal Input
  useEffect(() => {
    if (
      modal &&
      (modal.type === "person" ||
        modal.type === "order" ||
        modal.type === "sub-order" ||
        modal.type === "edit-order" ||
        modal.type === "edit-sub-order")
    ) {
      setTimeout(() => modalInputRef.current?.focus(), 0);
    }
  }, [modal]);

  const openModal = useCallback(
    (m: ModalState) => {
      if (m?.type === "edit-order") {
        const order = state.orders.find((o) => o.id === m.id);
        setModalName(order?.name || "");
        setModalTax(order?.tax?.toString() || "0");
        setModalServiceCharge(order?.serviceCharge?.toString() || "0");
        setModalPrice(order?.price?.toString() || "");
        setModalOrderType(order?.type || "multiple");
      } else if (m?.type === "edit-sub-order") {
        const order = state.orders.find((o) => o.id === m.orderId);
        const sub = order?.subOrders.find((so) => so.id === m.id);
        setModalName(sub?.name || "");
        setModalPrice(sub?.price.toString() || "");
        setModalTax("");
        setModalServiceCharge("");
      } else {
        setModalName("");
        setModalPrice("");
        setModalTax("0");
        setModalServiceCharge("0");
        setModalOrderType("multiple");
      }
      setModal(m);
    },
    [state.orders],
  );

  const closeModal = useCallback(() => {
    setModal(null);
    setModalName("");
    setModalPrice("");
    setModalTax("");
    setModalServiceCharge("");
  }, []);

  const totals = useMemo(() => calculateTotals(state), [state]);

  const addPerson = useCallback(
    (name: string) => {
      if (!name.trim()) return;
      const newPerson: Person = { id: crypto.randomUUID(), name: name.trim() };
      setState((prev) => ({ ...prev, people: [...prev.people, newPerson] }));
      closeModal();
    },
    [closeModal],
  );

  const removePerson = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        people: prev.people.filter((p) => p.id !== id),
        orders: prev.orders.map((o) => ({
          ...o,
          personIds: o.personIds?.filter((pid) => pid !== id),
          subOrders: o.subOrders.map((so) => ({
            ...so,
            personIds: so.personIds.filter((pid) => pid !== id),
          })),
        })),
      }));
      closeModal();
    },
    [closeModal],
  );

  const addOrder = useCallback(
    (
      name: string,
      type: "multiple" | "single",
      tax: number = 0,
      serviceCharge: number = 0,
      price: number = 0,
    ) => {
      if (!name.trim()) return;
      const newOrder: Order = {
        id: crypto.randomUUID(),
        name: name.trim(),
        type,
        subOrders: [],
        price: type === "single" ? price : 0,
        personIds: [],
        tax,
        serviceCharge,
      };
      setState((prev) => ({ ...prev, orders: [...prev.orders, newOrder] }));
      closeModal();
    },
    [closeModal],
  );

  const updateOrder = useCallback(
    (
      id: string,
      name: string,
      type: "multiple" | "single",
      tax: number,
      serviceCharge: number,
      price: number = 0,
    ) => {
      setState((prev) => ({
        ...prev,
        orders: prev.orders.map((o) =>
          o.id === id
            ? {
                ...o,
                name: name.trim(),
                type,
                tax,
                serviceCharge,
                price: type === "single" ? price : 0,
              }
            : o,
        ),
      }));
      closeModal();
    },
    [closeModal],
  );

  const removeOrder = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        orders: prev.orders.filter((o) => o.id !== id),
      }));
      closeModal();
    },
    [closeModal],
  );

  const moveOrder = useCallback((id: string, direction: "up" | "down") => {
    setState((prev) => {
      const index = prev.orders.findIndex((o) => o.id === id);
      if (index === -1) return prev;
      if (direction === "up" && index === 0) return prev;
      if (direction === "down" && index === prev.orders.length - 1) return prev;

      const newOrders = [...prev.orders];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      [newOrders[index], newOrders[targetIndex]] = [
        newOrders[targetIndex],
        newOrders[index],
      ];

      return { ...prev, orders: newOrders };
    });
  }, []);

  const addSubOrder = useCallback(
    (orderId: string, name: string, price: number) => {
      setState((prev) => ({
        ...prev,
        orders: prev.orders.map((o) => {
          if (o.id !== orderId) return o;
          const newSub: SubOrder = {
            id: crypto.randomUUID(),
            name: name.trim() || "New Item",
            price: price || 0,
            personIds: [],
          };
          return { ...o, subOrders: [...o.subOrders, newSub] };
        }),
      }));
      closeModal();
    },
    [closeModal],
  );

  const updateSubOrder = useCallback(
    (orderId: string, subId: string, name: string, price: number) => {
      setState((prev) => ({
        ...prev,
        orders: prev.orders.map((o) => {
          if (o.id !== orderId) return o;
          return {
            ...o,
            subOrders: o.subOrders.map((so) =>
              so.id === subId ? { ...so, name: name.trim(), price } : so,
            ),
          };
        }),
      }));
      closeModal();
    },
    [closeModal],
  );

  const removeSubOrder = useCallback(
    (orderId: string, subId: string) => {
      setState((prev) => ({
        ...prev,
        orders: prev.orders.map((o) => {
          if (o.id !== orderId) return o;
          return {
            ...o,
            subOrders: o.subOrders.filter((so) => so.id !== subId),
          };
        }),
      }));
      closeModal();
    },
    [closeModal],
  );

  const moveSubOrder = useCallback(
    (orderId: string, subId: string, direction: "up" | "down") => {
      setState((prev) => ({
        ...prev,
        orders: prev.orders.map((o) => {
          if (o.id !== orderId) return o;
          const index = o.subOrders.findIndex((so) => so.id === subId);
          if (index === -1) return o;
          if (direction === "up" && index === 0) return o;
          if (direction === "down" && index === o.subOrders.length - 1)
            return o;

          const newSubOrders = [...o.subOrders];
          const targetIndex = direction === "up" ? index - 1 : index + 1;
          [newSubOrders[index], newSubOrders[targetIndex]] = [
            newSubOrders[targetIndex],
            newSubOrders[index],
          ];

          return { ...o, subOrders: newSubOrders };
        }),
      }));
    },
    [],
  );

  const togglePersonInSubOrder = useCallback(
    (orderId: string, subId: string, personId: string) => {
      setState((prev) => ({
        ...prev,
        orders: prev.orders.map((o) => {
          if (o.id !== orderId) return o;
          return {
            ...o,
            subOrders: o.subOrders.map((so) => {
              if (so.id !== subId) return so;
              const personIds = so.personIds.includes(personId)
                ? so.personIds.filter((id) => id !== personId)
                : [...so.personIds, personId];
              return { ...so, personIds };
            }),
          };
        }),
      }));
    },
    [],
  );

  const togglePersonInSingleOrder = useCallback(
    (orderId: string, personId: string) => {
      setState((prev) => ({
        ...prev,
        orders: prev.orders.map((o) => {
          if (o.id !== orderId) return o;
          const personIds = o.personIds?.includes(personId)
            ? o.personIds.filter((id) => id !== personId)
            : [...(o.personIds || []), personId];
          return { ...o, personIds };
        }),
      }));
    },
    [],
  );

  if (!isLoaded) return <div>Loading...</div>;

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modal || !modalName.trim()) return;

    if (modal.type === "person") {
      addPerson(modalName);
    } else if (modal.type === "order") {
      const price =
        modalOrderType === "single" ? parseFloat(modalPrice || "0") : 0;
      addOrder(
        modalName,
        modalOrderType,
        parseFloat(modalTax || "0"),
        parseFloat(modalServiceCharge || "0"),
        price,
      );
    } else if (modal.type === "edit-order") {
      const price =
        modalOrderType === "single" ? parseFloat(modalPrice || "0") : 0;
      updateOrder(
        modal.id,
        modalName,
        modalOrderType,
        parseFloat(modalTax || "0"),
        parseFloat(modalServiceCharge || "0"),
        price,
      );
    } else if (modal.type === "sub-order") {
      const price = parseFloat(modalPrice || "0");
      addSubOrder(modal.orderId, modalName, price);
    } else if (modal.type === "edit-sub-order") {
      const price = parseFloat(modalPrice || "0");
      updateSubOrder(modal.orderId, modal.id, modalName, price);
    } else if (modal.type === "confirm-delete") {
      if (modal.target === "person") removePerson(modal.id);
      else if (modal.target === "order") removeOrder(modal.id);
      else if (modal.target === "sub-order" && modal.orderId)
        removeSubOrder(modal.orderId, modal.id);
    }
  };

  const isSubmitDisabled =
    modal?.type !== "confirm-delete" &&
    (!modalName.trim() ||
      ((modal?.type === "sub-order" ||
        modal?.type === "edit-sub-order" ||
        (modal?.type.endsWith("order") && modalOrderType === "single")) &&
        !modalPrice.trim()));

  return (
    <main style={{ maxWidth: "95%" }}>
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <h1 style={{ marginBottom: "0.5rem" }}>Share bill</h1>
        <p style={{ color: "var(--secondary)", fontWeight: "500" }}>
          Share bill with your friends
        </p>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            {modal.type === "confirm-delete" ? (
              <React.Fragment>
                <h3 style={{ color: "#d73a49" }}>Confirm Delete</h3>
                <p style={{ marginBottom: "1.5rem" }}>
                  Are you sure you want to remove <strong>{modal.name}</strong>?
                  This action cannot be undone.
                </p>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={closeModal}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ background: "#dc3545" }}
                    onClick={handleModalSubmit}
                  >
                    Confirm Delete
                  </button>
                </div>
              </React.Fragment>
            ) : (
              <React.Fragment>
                <h3>
                  {modal.type === "person" && "Add Person"}
                  {modal.type === "order" && "Add New Order"}
                  {modal.type === "edit-order" && "Edit Order"}
                  {modal.type === "sub-order" && "Add Item"}
                  {modal.type === "edit-sub-order" && "Edit Item"}
                </h3>
                <form onSubmit={handleModalSubmit}>
                  <div className="flex-col">
                    {(modal.type === "order" ||
                      modal.type === "edit-order") && (
                      <div
                        className="flex-row"
                        style={{
                          background: "#f0f2f5",
                          padding: "4px",
                          borderRadius: "8px",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setModalOrderType("multiple")}
                          style={{
                            flex: 1,
                            padding: "8px",
                            fontSize: "0.8rem",
                            background:
                              modalOrderType === "multiple"
                                ? "white"
                                : "transparent",
                            boxShadow:
                              modalOrderType === "multiple"
                                ? "0 2px 4px rgba(0,0,0,0.1)"
                                : "none",
                          }}
                        >
                          Multiple Items
                        </button>
                        <button
                          type="button"
                          onClick={() => setModalOrderType("single")}
                          style={{
                            flex: 1,
                            padding: "8px",
                            fontSize: "0.8rem",
                            background:
                              modalOrderType === "single"
                                ? "white"
                                : "transparent",
                            boxShadow:
                              modalOrderType === "single"
                                ? "0 2px 4px rgba(0,0,0,0.1)"
                                : "none",
                          }}
                        >
                          Single Item
                        </button>
                      </div>
                    )}

                    <label>Name</label>
                    <input
                      ref={modalInputRef}
                      type="text"
                      value={modalName}
                      onChange={(e) => setModalName(e.target.value)}
                      placeholder={
                        modal.type === "person"
                          ? "Enter name"
                          : modal.type === "order" ||
                              modal.type === "edit-order"
                            ? "Enter order name (e.g., Dinner)"
                            : "Item name"
                      }
                    />

                    {(modal.type === "sub-order" ||
                      modal.type === "edit-sub-order" ||
                      ((modal.type === "order" ||
                        modal.type === "edit-order") &&
                        modalOrderType === "single")) && (
                      <>
                        <label>Price</label>
                        <input
                          type="number"
                          step="0.01"
                          value={modalPrice}
                          onChange={(e) => setModalPrice(e.target.value)}
                          placeholder="Price"
                        />
                      </>
                    )}

                    {(modal.type === "order" ||
                      modal.type === "edit-order") && (
                      <div className="grid-cols-2">
                        <div>
                          <label>Service Charge (%)</label>
                          <input
                            type="number"
                            value={modalServiceCharge}
                            onChange={(e) =>
                              setModalServiceCharge(e.target.value)
                            }
                          />
                        </div>
                        <div>
                          <label>Tax (%)</label>
                          <input
                            type="number"
                            value={modalTax}
                            onChange={(e) => setModalTax(e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="modal-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={closeModal}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={isSubmitDisabled}
                      style={{
                        opacity: isSubmitDisabled ? 0.5 : 1,
                        cursor: isSubmitDisabled ? "not-allowed" : "pointer",
                      }}
                    >
                      {modal.type.startsWith("edit") ? "Update" : "Add"}
                    </button>
                  </div>
                </form>
              </React.Fragment>
            )}
          </div>
        </div>
      )}

      <section className="card">
        <div
          className="flex-row flex-row-mobile-stack"
          style={{ justifyContent: "space-between", marginBottom: "1rem" }}
        >
          <h2>Bill Details</h2>
          <div className="flex-row">
            <button
              className="btn-secondary"
              onClick={() => openModal({ type: "person" })}
            >
              + Add Person
            </button>
            <button
              className="btn-primary"
              onClick={() => openModal({ type: "order" })}
            >
              + Add Order
            </button>
          </div>
        </div>

        {/* Mobile only Tag list right under header */}
        {state.people.length > 0 && (
          <div
            className="mobile-only"
            style={{ marginBottom: "1.5rem", padding: "0 0.25rem" }}
          >
            <div className="flex-row" style={{ flexWrap: "wrap", gap: "6px" }}>
              {state.people.map((p) => (
                <span
                  key={p.id}
                  className="person-chip"
                  style={{
                    background: "white",
                    border: "1px solid var(--border)",
                    fontSize: "0.8rem",
                    padding: "4px 10px",
                  }}
                >
                  {p.name}
                  <button
                    onClick={() =>
                      openModal({
                        type: "confirm-delete",
                        target: "person",
                        id: p.id,
                        name: p.name,
                      })
                    }
                    style={{
                      background: "none",
                      color: "#dc3545",
                      padding: "0 0 0 6px",
                      fontSize: "0.9rem",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Desktop Table View */}
        <div className="table-container desktop-only">
          <table>
            <thead>
              {state.people.length > 0 ? (
                <React.Fragment>
                  <tr>
                    <th rowSpan={2} className="col-item">
                      Order / Item Name
                    </th>
                    <th rowSpan={2} className="col-price">
                      Price
                    </th>
                    <th
                      colSpan={state.people.length}
                      className="people-group-header"
                    >
                      Participants
                    </th>
                    <th rowSpan={2} className="col-action">
                      Action
                    </th>
                  </tr>
                  <tr>
                    {state.people.map((p) => (
                      <th key={p.id} className="col-person">
                        <div
                          className="flex-row"
                          style={{ justifyContent: "center", gap: "4px" }}
                        >
                          <span style={{ whiteSpace: "nowrap" }}>{p.name}</span>
                          <button
                            className="btn-icon"
                            onClick={() =>
                              openModal({
                                type: "confirm-delete",
                                target: "person",
                                id: p.id,
                                name: p.name,
                              })
                            }
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
                  <td
                    colSpan={3 + state.people.length}
                    style={{ textAlign: "center", color: "#999" }}
                  >
                    No orders added yet.
                  </td>
                </tr>
              )}
              {state.orders.map((order, orderIndex) => {
                const orderSubtotal =
                  order.type === "single"
                    ? order.price || 0
                    : order.subOrders.reduce((sum, so) => sum + so.price, 0);
                const orderSC =
                  orderSubtotal * ((order.serviceCharge || 0) / 100);
                const orderTax =
                  (orderSubtotal + orderSC) * ((order.tax || 0) / 100);
                const orderTotal = orderSubtotal + orderSC + orderTax;
                const isOrderIncomplete =
                  order.type === "single"
                    ? !order.personIds || order.personIds.length === 0
                    : order.subOrders.some((so) => so.personIds.length === 0);
                const hasAdjustments =
                  (order.tax || 0) + (order.serviceCharge || 0) > 0;

                // Calculate individual totals for this specific order
                const orderPersonSubtotals: Record<string, number> = {};
                if (order.type === "single") {
                  if (order.personIds && order.personIds.length > 0) {
                    const splitPrice =
                      (order.price || 0) / order.personIds.length;
                    order.personIds.forEach((pid) => {
                      orderPersonSubtotals[pid] = splitPrice;
                    });
                  }
                } else {
                  order.subOrders.forEach((sub) => {
                    if (sub.personIds.length > 0) {
                      const splitPrice = sub.price / sub.personIds.length;
                      sub.personIds.forEach((pid) => {
                        orderPersonSubtotals[pid] =
                          (orderPersonSubtotals[pid] || 0) + splitPrice;
                      });
                    }
                  });
                }

                return (
                  <React.Fragment key={order.id}>
                    <tr className="order-group-row">
                      <td>
                        <div className="flex-col" style={{ gap: 0 }}>
                          <div className="flex-row">
                            <span style={{ fontWeight: 700 }}>
                              {order.name}
                            </span>
                            {order.type === "single" && (
                              <span
                                style={{
                                  fontSize: "0.6rem",
                                  background: "#eee",
                                  padding: "2px 4px",
                                  borderRadius: "3px",
                                  color: "#666",
                                }}
                              >
                                SINGLE
                              </span>
                            )}
                            {order.tax || order.serviceCharge ? (
                              <span
                                style={{
                                  fontSize: "0.7rem",
                                  color: "var(--primary)",
                                  background: "#e7f3ff",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                }}
                              >
                                {order.serviceCharge
                                  ? `SC ${order.serviceCharge}% `
                                  : ""}
                                {order.tax ? `Tax ${order.tax}%` : ""}
                              </span>
                            ) : null}
                          </div>
                          {isOrderIncomplete && (
                            <div
                              className="unassigned-warning"
                              style={{ marginLeft: "0.25rem" }}
                            >
                              <WarningIcon /> Not complete
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="order-total-cell">
                        <div
                          className="flex-col"
                          style={{ alignItems: "center", gap: 0 }}
                        >
                          <div
                            style={{
                              fontSize: hasAdjustments ? "0.8rem" : "1rem",
                              opacity: hasAdjustments ? 0.7 : 1,
                            }}
                          >
                            {orderSubtotal.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                          {hasAdjustments && (
                            <div
                              style={{
                                fontSize: "0.9rem",
                                color: "var(--primary)",
                                fontWeight: 700,
                              }}
                            >
                              {orderTotal.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </div>
                          )}
                        </div>
                      </td>
                      {state.people.map((p) => {
                        const personBaseShare = orderPersonSubtotals[p.id] || 0;
                        let personOrderTotal = 0;
                        if (orderSubtotal > 0) {
                          const shareRatio = personBaseShare / orderSubtotal;
                          personOrderTotal =
                            personBaseShare +
                            orderSC * shareRatio +
                            orderTax * shareRatio;
                        }

                        if (order.type === "single") {
                          return (
                            <td
                              key={p.id}
                              className={`check-cell ${order.personIds?.includes(p.id) ? "active" : ""}`}
                              onClick={() =>
                                togglePersonInSingleOrder(order.id, p.id)
                              }
                            >
                              <div
                                className="flex-col"
                                style={{ alignItems: "center", gap: 0 }}
                              >
                                <div style={{ fontSize: "0.9rem" }}>
                                  {order.personIds?.includes(p.id) ? "●" : "○"}
                                </div>
                                <div
                                  style={{
                                    fontSize: hasAdjustments
                                      ? "0.65rem"
                                      : "0.7rem",
                                    opacity: hasAdjustments ? 0.7 : 1,
                                    fontWeight: hasAdjustments ? 400 : 700,
                                  }}
                                >
                                  {personBaseShare.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </div>
                                {hasAdjustments && (
                                  <div
                                    style={{
                                      fontSize: "0.7rem",
                                      fontWeight: 700,
                                    }}
                                  >
                                    {personOrderTotal.toLocaleString(
                                      undefined,
                                      {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      },
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        }

                        return (
                          <td
                            key={p.id}
                            style={{
                              textAlign: "center",
                              color: "var(--primary)",
                            }}
                          >
                            <div
                              className="flex-col"
                              style={{ alignItems: "center", gap: 0 }}
                            >
                              <div
                                style={{
                                  fontSize: hasAdjustments
                                    ? "0.7rem"
                                    : "0.75rem",
                                  opacity: hasAdjustments ? 0.7 : 1,
                                  fontWeight: hasAdjustments ? 400 : 600,
                                }}
                              >
                                {personBaseShare > 0
                                  ? personBaseShare.toLocaleString(undefined, {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })
                                  : "0.00"}
                              </div>
                              {hasAdjustments && (
                                <div
                                  style={{
                                    fontSize: "0.75rem",
                                    fontWeight: 700,
                                  }}
                                >
                                  {personOrderTotal.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                      <td className="col-action">
                        <div
                          className="flex-row"
                          style={{ justifyContent: "center", gap: "4px" }}
                        >
                          <button
                            className="btn-icon"
                            style={{ color: "#007bff" }}
                            onClick={() =>
                              openModal({ type: "edit-order", id: order.id })
                            }
                            title="Edit order / adjustments"
                          >
                            <EditIcon />
                          </button>
                          <button
                            className="btn-icon"
                            style={{ color: "#6c757d" }}
                            disabled={orderIndex === 0}
                            onClick={() => moveOrder(order.id, "up")}
                            title="Move up"
                          >
                            <UpIcon />
                          </button>
                          <button
                            className="btn-icon"
                            style={{ color: "#6c757d" }}
                            disabled={orderIndex === state.orders.length - 1}
                            onClick={() => moveOrder(order.id, "down")}
                            title="Move down"
                          >
                            <DownIcon />
                          </button>
                          <button
                            className="btn-icon"
                            onClick={() =>
                              openModal({
                                type: "confirm-delete",
                                target: "order",
                                id: order.id,
                                name: order.name,
                              })
                            }
                            title="Delete order"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {order.type === "multiple" && (
                      <React.Fragment>
                        {order.subOrders.map((sub, subIndex) => {
                          const isUnassigned = sub.personIds.length === 0;
                          const itemSC =
                            sub.price * ((order.serviceCharge || 0) / 100);
                          const itemTax =
                            (sub.price + itemSC) * ((order.tax || 0) / 100);
                          const itemTotalWithAdjustments =
                            sub.price + itemSC + itemTax;

                          return (
                            <tr
                              key={sub.id}
                              className={`sub-order-row ${isUnassigned ? "unassigned" : ""}`}
                            >
                              <td style={{ paddingLeft: "2rem" }}>
                                <div className="flex-col" style={{ gap: 0 }}>
                                  <span>{sub.name}</span>
                                  {isUnassigned && (
                                    <div className="unassigned-warning">
                                      <WarningIcon /> Not assigned
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="cell-price">
                                <div
                                  className="flex-col"
                                  style={{ alignItems: "flex-end", gap: 0 }}
                                >
                                  <div
                                    style={{
                                      fontSize: hasAdjustments
                                        ? "0.8rem"
                                        : "1rem",
                                      opacity: hasAdjustments ? 0.7 : 1,
                                    }}
                                  >
                                    {sub.price.toLocaleString(undefined, {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}
                                  </div>
                                  {hasAdjustments && (
                                    <div
                                      style={{
                                        fontSize: "0.8rem",
                                        color: "var(--primary)",
                                        fontWeight: 700,
                                      }}
                                    >
                                      {itemTotalWithAdjustments.toLocaleString(
                                        undefined,
                                        {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        },
                                      )}
                                    </div>
                                  )}
                                </div>
                              </td>
                              {state.people.map((p) => (
                                <td
                                  key={p.id}
                                  className={`check-cell ${sub.personIds.includes(p.id) ? "active" : ""}`}
                                  onClick={() =>
                                    togglePersonInSubOrder(
                                      order.id,
                                      sub.id,
                                      p.id,
                                    )
                                  }
                                >
                                  {sub.personIds.includes(p.id) ? "●" : "○"}
                                </td>
                              ))}
                              <td className="col-action">
                                <div
                                  className="flex-row"
                                  style={{
                                    justifyContent: "center",
                                    gap: "4px",
                                  }}
                                >
                                  <button
                                    className="btn-icon"
                                    style={{ color: "#007bff" }}
                                    onClick={() =>
                                      openModal({
                                        type: "edit-sub-order",
                                        orderId: order.id,
                                        id: sub.id,
                                      })
                                    }
                                    title="Edit item"
                                  >
                                    <EditIcon />
                                  </button>
                                  <button
                                    className="btn-icon"
                                    style={{ color: "#6c757d" }}
                                    disabled={subIndex === 0}
                                    onClick={() =>
                                      moveSubOrder(order.id, sub.id, "up")
                                    }
                                    title="Move up"
                                  >
                                    <UpIcon />
                                  </button>
                                  <button
                                    className="btn-icon"
                                    style={{ color: "#6c757d" }}
                                    disabled={
                                      subIndex === order.subOrders.length - 1
                                    }
                                    onClick={() =>
                                      moveSubOrder(order.id, sub.id, "down")
                                    }
                                    title="Move down"
                                  >
                                    <DownIcon />
                                  </button>
                                  <button
                                    className="btn-icon"
                                    onClick={() =>
                                      openModal({
                                        type: "confirm-delete",
                                        target: "sub-order",
                                        id: sub.id,
                                        orderId: order.id,
                                        name: sub.name,
                                      })
                                    }
                                    title="Remove item"
                                  >
                                    <TrashIcon />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        <tr>
                          <td
                            colSpan={3 + state.people.length}
                            style={{ padding: "1.5rem 0.75rem" }}
                          >
                            <button
                              className="btn-secondary"
                              style={{
                                width: "100%",
                                padding: "0.5rem",
                                fontSize: "0.8rem",
                              }}
                              onClick={() =>
                                openModal({
                                  type: "sub-order",
                                  orderId: order.id,
                                })
                              }
                            >
                              + Add Item to {order.name}
                            </button>
                          </td>
                        </tr>
                      </React.Fragment>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="mobile-only">
          {state.orders.length === 0 && (
            <div
              style={{ textAlign: "center", padding: "2rem", color: "#999" }}
            >
              No orders added yet.
            </div>
          )}
          {state.orders.map((order, orderIndex) => {
            const orderSubtotal =
              order.type === "single"
                ? order.price || 0
                : order.subOrders.reduce((sum, so) => sum + so.price, 0);
            const orderSC = orderSubtotal * ((order.serviceCharge || 0) / 100);
            const orderTax =
              (orderSubtotal + orderSC) * ((order.tax || 0) / 100);
            const orderTotal = orderSubtotal + orderSC + orderTax;
            const isOrderIncomplete =
              order.type === "single"
                ? !order.personIds || order.personIds.length === 0
                : order.subOrders.some((so) => so.personIds.length === 0);
            const hasAdjustments =
              (order.tax || 0) + (order.serviceCharge || 0) > 0;

            return (
              <div key={order.id} className="mobile-order-card">
                <div
                  className="mobile-order-header"
                  style={{
                    flexDirection: "column",
                    gap: "12px",
                    alignItems: "stretch",
                  }}
                >
                  <div
                    className="flex-row"
                    style={{ justifyContent: "space-between", width: "100%" }}
                  >
                    <div className="flex-row">
                      <strong style={{ fontSize: "1.1rem" }}>
                        {order.name}
                      </strong>
                      <button
                        className="btn-icon"
                        style={{ color: "#007bff" }}
                        onClick={() =>
                          openModal({ type: "edit-order", id: order.id })
                        }
                      >
                        <EditIcon />
                      </button>
                    </div>
                    <div className="flex-row">
                      <button
                        className="btn-icon"
                        style={{ color: "#6c757d" }}
                        disabled={orderIndex === 0}
                        onClick={() => moveOrder(order.id, "up")}
                      >
                        <UpIcon />
                      </button>
                      <button
                        className="btn-icon"
                        style={{ color: "#6c757d" }}
                        disabled={orderIndex === state.orders.length - 1}
                        onClick={() => moveOrder(order.id, "down")}
                      >
                        <DownIcon />
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() =>
                          openModal({
                            type: "confirm-delete",
                            target: "order",
                            id: order.id,
                            name: order.name,
                          })
                        }
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                  <div
                    className="flex-row"
                    style={{
                      flexWrap: "wrap",
                      gap: "16px",
                      borderTop: "1px solid #e9ecef",
                      paddingTop: "8px",
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <div className="flex-col" style={{ gap: 0 }}>
                      <span
                        style={{
                          fontSize: "0.8rem",
                          opacity: hasAdjustments ? 0.7 : 1,
                        }}
                      >
                        Subtotal:{" "}
                        {orderSubtotal.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                      {hasAdjustments && (
                        <span
                          style={{
                            fontSize: "0.9rem",
                            fontWeight: 700,
                            color: "var(--primary)",
                          }}
                        >
                          Final:{" "}
                          {orderTotal.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      )}
                    </div>
                    <div
                      className="flex-row"
                      style={{ gap: "8px", alignSelf: "center" }}
                    >
                      {order.tax || order.serviceCharge ? (
                        <span
                          style={{
                            fontSize: "0.7rem",
                            color: "var(--primary)",
                            background: "#e7f3ff",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontWeight: 600,
                          }}
                        >
                          {order.serviceCharge
                            ? `SC ${order.serviceCharge}% `
                            : ""}
                          {order.tax ? `Tax ${order.tax}%` : ""}
                        </span>
                      ) : null}
                      {isOrderIncomplete && (
                        <div className="unassigned-warning">
                          <WarningIcon /> Not complete
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  {order.type === "single" ? (
                    <div
                      className="mobile-item-card"
                      style={{ borderBottom: "none" }}
                    >
                      <label
                        style={{
                          fontSize: "0.7rem",
                          textTransform: "uppercase",
                          marginBottom: "0.5rem",
                          display: "block",
                        }}
                      >
                        Split with:
                      </label>
                      <div className="mobile-person-grid">
                        {state.people.map((p) => (
                          <button
                            key={p.id}
                            className={`mobile-person-toggle ${order.personIds?.includes(p.id) ? "active" : ""}`}
                            onClick={() =>
                              togglePersonInSingleOrder(order.id, p.id)
                            }
                          >
                            {p.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      {order.subOrders.map((sub, subIndex) => {
                        const isUnassigned = sub.personIds.length === 0;
                        const itemSC =
                          sub.price * ((order.serviceCharge || 0) / 100);
                        const itemTax =
                          (sub.price + itemSC) * ((order.tax || 0) / 100);
                        const itemTotalWithAdjustments =
                          sub.price + itemSC + itemTax;

                        return (
                          <div
                            key={sub.id}
                            className={`mobile-item-card ${isUnassigned ? "unassigned" : ""}`}
                          >
                            <div className="mobile-item-header">
                              <div className="flex-col" style={{ gap: "2px" }}>
                                <div className="flex-row">
                                  <span>{sub.name}</span>
                                  <button
                                    className="btn-icon"
                                    style={{ color: "#007bff", padding: "2px" }}
                                    onClick={() =>
                                      openModal({
                                        type: "edit-sub-order",
                                        orderId: order.id,
                                        id: sub.id,
                                      })
                                    }
                                  >
                                    <EditIcon />
                                  </button>
                                </div>
                                <div className="flex-col" style={{ gap: 0 }}>
                                  <span
                                    style={{
                                      fontSize: "0.8rem",
                                      opacity: hasAdjustments ? 0.7 : 1,
                                      fontWeight: hasAdjustments ? 400 : 700,
                                    }}
                                  >
                                    {sub.price.toLocaleString(undefined, {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}
                                  </span>
                                  {hasAdjustments && (
                                    <span
                                      style={{
                                        fontWeight: 700,
                                        color: "var(--primary)",
                                      }}
                                    >
                                      {itemTotalWithAdjustments.toLocaleString(
                                        undefined,
                                        {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        },
                                      )}
                                    </span>
                                  )}
                                </div>
                                {isUnassigned && (
                                  <div className="unassigned-warning">
                                    <WarningIcon /> Not assigned
                                  </div>
                                )}
                              </div>
                              <div className="flex-row">
                                <button
                                  className="btn-icon"
                                  style={{ color: "#6c757d", padding: "2px" }}
                                  disabled={subIndex === 0}
                                  onClick={() =>
                                    moveSubOrder(order.id, sub.id, "up")
                                  }
                                >
                                  <UpIcon />
                                </button>
                                <button
                                  className="btn-icon"
                                  style={{ color: "#6c757d", padding: "2px" }}
                                  disabled={
                                    subIndex === order.subOrders.length - 1
                                  }
                                  onClick={() =>
                                    moveSubOrder(order.id, sub.id, "down")
                                  }
                                >
                                  <DownIcon />
                                </button>
                                <button
                                  className="btn-icon"
                                  style={{ padding: "2px" }}
                                  onClick={() =>
                                    openModal({
                                      type: "confirm-delete",
                                      target: "sub-order",
                                      id: sub.id,
                                      orderId: order.id,
                                      name: sub.name,
                                    })
                                  }
                                >
                                  <TrashIcon />
                                </button>
                              </div>
                            </div>
                            <div className="mobile-person-grid">
                              {state.people.map((p) => (
                                <button
                                  key={p.id}
                                  className={`mobile-person-toggle ${sub.personIds.includes(p.id) ? "active" : ""}`}
                                  onClick={() =>
                                    togglePersonInSubOrder(
                                      order.id,
                                      sub.id,
                                      p.id,
                                    )
                                  }
                                >
                                  {p.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                      <button
                        className="btn-secondary"
                        style={{
                          width: "100%",
                          padding: "0.75rem",
                          borderRadius: 0,
                        }}
                        onClick={() =>
                          openModal({ type: "sub-order", orderId: order.id })
                        }
                      >
                        + Add Item
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card">
        <h2>Summary</h2>
        <div className="flex-col">
          {state.people.map((p) => {
            const groupedItems: {
              orderName: string;
              tax: number;
              sc: number;
              items: { subName: string; price: number; sharedWith: number }[];
            }[] = [];

            state.orders.forEach((o) => {
              if (o.type === "single") {
                if (o.personIds?.includes(p.id)) {
                  groupedItems.push({
                    orderName: o.name,
                    tax: o.tax || 0,
                    sc: o.serviceCharge || 0,
                    items: [
                      {
                        subName: "(Single Item)",
                        price: o.price || 0,
                        sharedWith: o.personIds.length,
                      },
                    ],
                  });
                }
              } else {
                const itemsForPerson = o.subOrders
                  .filter((so) => so.personIds.includes(p.id))
                  .map((so) => ({
                    subName: so.name,
                    price: so.price,
                    sharedWith: so.personIds.length,
                  }));

                if (itemsForPerson.length > 0) {
                  groupedItems.push({
                    orderName: o.name,
                    tax: o.tax || 0,
                    sc: o.serviceCharge || 0,
                    items: itemsForPerson,
                  });
                }
              }
            });

            return (
              <details key={p.id} className="person-summary-details">
                <summary>
                  <span>{p.name}</span>
                  <div className="flex-row">
                    <span>
                      {totals.personTotals[p.id].toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                    <ChevronDownIcon />
                  </div>
                </summary>
                <div className="person-summary-content">
                  {groupedItems.length === 0 ? (
                    <p style={{ color: "#999", fontStyle: "italic" }}>
                      No items assigned.
                    </p>
                  ) : (
                    <React.Fragment>
                      {groupedItems.map((group, gIdx) => {
                        const orderBaseSubtotal = group.items.reduce(
                          (sum, item) => sum + item.price / item.sharedWith,
                          0,
                        );
                        const scAmount = orderBaseSubtotal * (group.sc / 100);
                        const taxAmount =
                          (orderBaseSubtotal + scAmount) * (group.tax / 100);
                        const orderTotalWithAdjustments =
                          orderBaseSubtotal + scAmount + taxAmount;

                        return (
                          <div key={gIdx} style={{ marginBottom: "1rem" }}>
                            <div className="summary-order-group-header">
                              {group.orderName}
                            </div>
                            {group.items.map((item, idx) => (
                              <div key={idx} className="summary-item-row">
                                <span>
                                  {item.subName}{" "}
                                  {item.sharedWith > 1 && (
                                    <small>(Shared by {item.sharedWith})</small>
                                  )}
                                </span>
                                <span className="cell-price">
                                  {(
                                    item.price / item.sharedWith
                                  ).toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </span>
                              </div>
                            ))}
                            {group.sc > 0 && (
                              <div
                                className="summary-item-row"
                                style={{
                                  fontStyle: "italic",
                                  fontSize: "0.8rem",
                                  borderTop: "1px dashed #dee2e6",
                                  marginTop: "4px",
                                  paddingTop: "4px",
                                }}
                              >
                                <span>Service Charge ({group.sc}%)</span>
                                <span className="cell-price">
                                  {scAmount.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </span>
                              </div>
                            )}
                            {group.tax > 0 && (
                              <div
                                className="summary-item-row"
                                style={{
                                  fontStyle: "italic",
                                  fontSize: "0.8rem",
                                }}
                              >
                                <span>Tax ({group.tax}%)</span>
                                <span className="cell-price">
                                  {taxAmount.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </span>
                              </div>
                            )}
                            <div
                              className="summary-item-row"
                              style={{ fontWeight: 600, fontSize: "0.85rem" }}
                            >
                              <span>Total</span>
                              <span className="cell-price">
                                {orderTotalWithAdjustments.toLocaleString(
                                  undefined,
                                  {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  },
                                )}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                      <div
                        className="summary-item-subtotal summary-item-row"
                        style={{
                          borderTop: "2px solid var(--border)",
                          marginTop: "1rem",
                          paddingTop: "1rem",
                        }}
                      >
                        <span>Total</span>
                        <span className="cell-price">
                          {totals.personTotals[p.id].toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </React.Fragment>
                  )}
                </div>
              </details>
            );
          })}
          <div
            className="total-row"
            style={{
              marginTop: "1rem",
              borderTop: "2px solid var(--border)",
              paddingTop: "1rem",
            }}
          >
            <span>Total Bill</span>
            <span>
              {totals.total.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>

        <button
          className="btn-primary"
          style={{ width: "100%", marginTop: "1rem" }}
          onClick={() => {
            const url = window.location.href;
            navigator.clipboard.writeText(url);
            alert("Link copied to clipboard!");
          }}
        >
          Copy Shareable Link
        </button>
      </section>
    </main>
  );
}
