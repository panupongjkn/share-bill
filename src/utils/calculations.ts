import { BillState } from '@/types';

export interface CalculatedTotals {
  personTotals: Record<string, number>; // personId -> total
  subtotal: number;
  total: number;
  taxAmount: number;
  serviceChargeAmount: number;
}

export const calculateTotals = (state: BillState): CalculatedTotals => {
  const personTotals: Record<string, number> = {};
  
  // Initialize person totals
  state.people.forEach(p => {
    personTotals[p.id] = 0;
  });

  let subtotal = 0;

  state.orders.forEach(order => {
    order.subOrders.forEach(sub => {
      subtotal += sub.price;
      if (sub.personIds.length > 0) {
        const splitPrice = sub.price / sub.personIds.length;
        sub.personIds.forEach(pid => {
          if (personTotals[pid] !== undefined) {
            personTotals[pid] += splitPrice;
          }
        });
      }
    });
  });

  const taxRate = (state.tax || 0) / 100;
  const serviceChargeRate = (state.serviceCharge || 0) / 100;

  const serviceChargeAmount = subtotal * serviceChargeRate;
  const taxAmount = (subtotal + serviceChargeAmount) * taxRate;
  const total = subtotal + serviceChargeAmount + taxAmount;

  // Apply tax and service charge proportionally to each person
  state.people.forEach(p => {
    const personSubtotal = personTotals[p.id];
    if (subtotal > 0) {
      const share = personSubtotal / subtotal;
      personTotals[p.id] = personSubtotal + (serviceChargeAmount * share) + (taxAmount * share);
    }
  });

  return {
    personTotals,
    subtotal,
    total,
    taxAmount,
    serviceChargeAmount
  };
};
