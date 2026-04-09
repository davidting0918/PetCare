// Weight Record Types

export interface WeightRecord {
  id: string;
  pet_id: string;
  weight: number; // Weight in kg
  user_id: string;
  user_name?: string; // Optional user name for display
  timestamp: string; // ISO date string
  notes?: string;
  created_at: string;
  updated_at: string;
  is_active?: boolean;
}

export interface CreateWeightRequest {
  pet_id: string;
  weight: number; // Weight in kg, 0.1-200
  timestamp?: string; // ISO date string, defaults to current time
  notes?: string; // Optional notes, max 500 characters
}

export interface UpdateWeightRequest {
  weight?: number;
  timestamp?: string;
  notes?: string;
}

// Date Range for chart filtering
export interface DateRange {
  startDate: Date;
  endDate: Date;
}

// Search Weight Records Types
export interface SearchWeightRecordsRequest {
  pet_id?: string;
  weight_id?: string;
  user_id?: string;
  start?: string; // ISO date string
  end?: string; // ISO date string
  order_by?: 'timestamp' | 'created_at' | 'updated_at';
  order_direction?: 'asc' | 'desc';
  page?: number;
  number?: number; // Number of records per page
}

export interface SearchWeightRecordsResponse {
  records: WeightRecord[];
  total: number;
  page: number;
  number: number;
  total_pages: number;
}
