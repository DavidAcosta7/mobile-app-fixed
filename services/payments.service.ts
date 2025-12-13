import { supabase } from '../lib/supabase';

export type PaymentCurrency = 'USD' | 'COP' | 'EUR';
export type PaymentCategory = 'SERVICIOS' | 'ENTRETENIMIENTO' | 'TRANSPORTE' | 'SALUD' | 'ALIMENTACION' | 'OTROS';
export type PaymentStatus = 'PENDING' | 'URGENT' | 'COMPLETED' | 'FAILED' | 'OVERDUE';

export interface Payment {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  currency: PaymentCurrency;
  category: PaymentCategory;
  description?: string | null;
  status: PaymentStatus;
  selected_date: string;
  due_date: string;
  paid_date?: string | null;
  auto_debit: boolean;
  payment_url?: string | null;
  deep_link?: string | null;
  icon?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentInput {
  user_id: string;
  name: string;
  amount: number;
  currency: PaymentCurrency;
  category: PaymentCategory;
  description?: string;
  selected_date: Date | string;
  due_date: Date | string;
  auto_debit?: boolean;
  payment_url?: string;
  deep_link?: string;
  icon?: string;
}

export interface UpdatePaymentInput {
  name?: string;
  amount?: number;
  currency?: PaymentCurrency;
  category?: PaymentCategory;
  description?: string;
  status?: PaymentStatus;
  selected_date?: Date | string;
  due_date?: Date | string;
  paid_date?: Date | string | null;
  auto_debit?: boolean;
  payment_url?: string;
  deep_link?: string;
  icon?: string;
}

export const paymentService = {
  async create(data: CreatePaymentInput): Promise<Payment> {
    const { data: payment, error } = await supabase
      .from('payments')
      .insert({
        ...data,
        status: 'PENDING',
        selected_date: typeof data.selected_date === 'string' ? data.selected_date : data.selected_date.toISOString(),
        due_date: typeof data.due_date === 'string' ? data.due_date : data.due_date.toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Error creating payment: ${error.message}`);
    }

    return payment;
  },

  async findById(id: string): Promise<Payment | null> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error finding payment:', error);
      return null;
    }

    return data;
  },

  async findByUserId(userId: string): Promise<Payment[]> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .order('due_date', { ascending: true });

    if (error) {
      console.error('Error finding payments by user:', error);
      return [];
    }

    return data || [];
  },

  async findByUserIdAndStatus(userId: string, status: PaymentStatus): Promise<Payment[]> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .eq('status', status)
      .order('due_date', { ascending: true });

    if (error) {
      console.error('Error finding payments by status:', error);
      return [];
    }

    return data || [];
  },

  async update(id: string, data: UpdatePaymentInput): Promise<Payment> {
    const updateData: any = { ...data };
    
    if (data.selected_date) {
      updateData.selected_date = typeof data.selected_date === 'string' 
        ? data.selected_date 
        : data.selected_date.toISOString();
    }
    if (data.due_date) {
      updateData.due_date = typeof data.due_date === 'string' 
        ? data.due_date 
        : data.due_date.toISOString();
    }
    if (data.paid_date !== undefined) {
      updateData.paid_date = data.paid_date === null 
        ? null 
        : (typeof data.paid_date === 'string' ? data.paid_date : data.paid_date.toISOString());
    }

    const { data: payment, error } = await supabase
      .from('payments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Error updating payment: ${error.message}`);
    }

    return payment;
  },

  async updateStatus(id: string, status: PaymentStatus, paidDate?: Date): Promise<Payment> {
    const updateData: any = { status };
    if (paidDate) {
      updateData.paid_date = paidDate.toISOString();
    } else if (status === 'COMPLETED') {
      updateData.paid_date = new Date().toISOString();
    }

    const { data: payment, error } = await supabase
      .from('payments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Error updating payment status: ${error.message}`);
    }

    return payment;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Error deleting payment: ${error.message}`);
    }
  },

  async getMetricsByUserId(userId: string) {
    const payments = await this.findByUserId(userId);

    const total = payments.length;
    const pending = payments.filter(p => p.status === 'PENDING').length;
    const urgent = payments.filter(p => p.status === 'URGENT').length;
    const completed = payments.filter(p => p.status === 'COMPLETED').length;

    const monthlyTotal = payments
      .filter(p => p.status === 'PENDING' || p.status === 'URGENT')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total_pagos: total,
      pagos_pendientes: pending,
      pagos_urgentes: urgent,
      total_mensual: monthlyTotal,
      progreso_mensual: progress,
    };
  },
};

