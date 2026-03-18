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

  let grandSubtotal = 0;
  let grandTotalTax = 0;
  let grandTotalServiceCharge = 0;

  state.orders.forEach(order => {
    let orderSubtotal = 0;
    const orderPersonSubtotals: Record<string, number> = {};
    
    if (order.type === 'single') {
      orderSubtotal = order.price || 0;
      const personIds = order.personIds || [];
      if (personIds.length > 0) {
        const splitPrice = orderSubtotal / personIds.length;
        personIds.forEach(pid => {
          orderPersonSubtotals[pid] = (orderPersonSubtotals[pid] || 0) + splitPrice;
        });
      }
    } else {
      // Calculate subtotal for this multiple order
      order.subOrders.forEach(sub => {
        orderSubtotal += sub.price;
        if (sub.personIds.length > 0) {
          const splitPrice = sub.price / sub.personIds.length;
          sub.personIds.forEach(pid => {
            orderPersonSubtotals[pid] = (orderPersonSubtotals[pid] || 0) + splitPrice;
          });
        }
      });
    }

    const taxRate = (order.tax || 0) / 100;
    const serviceChargeRate = (order.serviceCharge || 0) / 100;

    const orderServiceChargeAmount = orderSubtotal * serviceChargeRate;
    const orderTaxAmount = (orderSubtotal + orderServiceChargeAmount) * taxRate;
    
    grandSubtotal += orderSubtotal;
    grandTotalTax += orderTaxAmount;
    grandTotalServiceCharge += orderServiceChargeAmount;

    // Apply this order's tax and service charge proportionally to each person's share of this order
    Object.keys(orderPersonSubtotals).forEach(pid => {
      if (personTotals[pid] !== undefined && orderSubtotal > 0) {
        const personBaseShare = orderPersonSubtotals[pid];
        const shareRatio = personBaseShare / orderSubtotal;
        
        personTotals[pid] += personBaseShare + (orderServiceChargeAmount * shareRatio) + (orderTaxAmount * shareRatio);
      }
    });
  });

  const grandTotal = grandSubtotal + grandTotalServiceCharge + grandTotalTax;

  return {
    personTotals,
    subtotal: grandSubtotal,
    total: grandTotal,
    taxAmount: grandTotalTax,
    serviceChargeAmount: grandTotalServiceCharge
  };
};
