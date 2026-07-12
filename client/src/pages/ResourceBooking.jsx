import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';
import DashboardLayout from '../layouts/DashboardLayout';
import Drawer from '../components/Drawer';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import { 
  Calendar as CalendarIcon, Clock, Plus, Search, SlidersHorizontal, 
  MapPin, Users, Info, ArrowLeftRight, Check, AlertCircle, Copy, 
  Trash2, X, ChevronLeft, ChevronRight, Laptop, Car, Monitor, DoorOpen
} from 'lucide-react';

export const ResourceBooking = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'ASSET_MANAGER';
  const isEmployee = user?.role === 'EMPLOYEE';

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [activeResource, setActiveResource] = useState(null);

  // Calendar state
  const [calendarView, setCalendarView] = useState('week'); // day, week, month
  const [currentDate, setCurrentDate] = useState(new Date());

  // Form Drawer state
  const [isBookDrawerOpen, setIsBookDrawerOpen] = useState(false);
  const [isResourceDrawerOpen, setIsResourceDrawerOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Overlap conflict warnings
  const [conflictError, setConflictError] = useState(null);

  // Form states
  // 1. Resource Form
  const [resourceForm, setResourceForm] = useState({
    name: '',
    category: 'Meeting Rooms',
    description: '',
    departmentId: '',
    location: '',
    capacity: '',
    bookable: true,
    status: 'ACTIVE',
  });

  // 2. Booking Form
  const [bookingForm, setBookingForm] = useState({
    resourceId: '',
    employeeId: user?.uuid || '',
    departmentId: user?.departmentId || '',
    title: '',
    purpose: '',
    startDate: '',
    startTime: '09:00',
    endDate: '',
    endTime: '10:00',
    notes: '',
  });

  // Fetch Departments
  const { data: departments } = useQuery({
    queryKey: ['departments-list'],
    queryFn: async () => {
      const res = await api.get('/api/departments', { params: { limit: 100, status: 'ACTIVE' } });
      return res.data.data;
    },
  });

  // Fetch Active Employees
  const { data: employees } = useQuery({
    queryKey: ['employees-list-all'],
    queryFn: async () => {
      const res = await api.get('/api/employees', { params: { limit: 100, status: 'ACTIVE' } });
      return res.data.data;
    },
  });

  // Fetch Resources
  const { data: resourcesData, isLoading: isResourcesLoading } = useQuery({
    queryKey: ['resources', search, categoryFilter, locationFilter],
    queryFn: async () => {
      const params = { limit: 100, search, category: categoryFilter, location: locationFilter };
      const res = await api.get('/api/resources', { params });
      return res.data.data;
    },
  });

  // Fetch Bookings
  const { data: bookingsData, isLoading: isBookingsLoading } = useQuery({
    queryKey: ['bookings', activeResource?.id],
    queryFn: async () => {
      const params = { limit: 200 };
      if (activeResource) {
        params.resourceId = activeResource.id;
      }
      const res = await api.get('/api/bookings', { params });
      return res.data.data;
    },
  });

  // Set first resource as active by default
  useEffect(() => {
    if (resourcesData && resourcesData.length > 0 && !activeResource) {
      setActiveResource(resourcesData[0]);
    }
  }, [resourcesData, activeResource]);

  // Mutations
  const createResourceMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/api/resources', payload);
      return res.data.data;
    },
    onSuccess: () => {
      addToast('success', 'Resource registered successfully!');
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      setIsResourceDrawerOpen(false);
      resetResourceForm();
    },
    onError: (err) => {
      addToast('error', err.response?.data?.message || 'Failed to create resource');
    },
  });

  const createBookingMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/api/bookings', payload);
      return res.data.data;
    },
    onSuccess: () => {
      addToast('success', 'Booking created successfully!');
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setIsBookDrawerOpen(false);
      resetBookingForm();
    },
    onError: (err) => {
      if (err.response?.status === 409) {
        const conflict = err.response?.data?.errors?.[0];
        setConflictError(conflict);
      } else {
        addToast('error', err.response?.data?.message || 'Failed to reserve resource');
      }
    },
  });

  const cancelBookingMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.patch(`/api/bookings/${id}/cancel`);
      return res.data.data;
    },
    onSuccess: () => {
      addToast('success', 'Booking cancelled successfully');
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setIsDetailsOpen(false);
    },
    onError: (err) => {
      addToast('error', err.response?.data?.message || 'Failed to cancel booking');
    },
  });

  const duplicateBookingMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/api/bookings', payload);
      return res.data.data;
    },
    onSuccess: () => {
      addToast('success', 'Booking duplicated successfully!');
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setIsDetailsOpen(false);
    },
    onError: (err) => {
      addToast('error', err.response?.data?.message || 'Failed to duplicate booking');
    },
  });

  // Form Reset Helpers
  const resetResourceForm = () => {
    setResourceForm({
      name: '',
      category: 'Meeting Rooms',
      description: '',
      departmentId: '',
      location: '',
      capacity: '',
      bookable: true,
      status: 'ACTIVE',
    });
  };

  const resetBookingForm = () => {
    setBookingForm({
      resourceId: activeResource?.id || '',
      employeeId: user?.uuid || '',
      departmentId: user?.departmentId || '',
      title: '',
      purpose: '',
      startDate: new Date().toISOString().split('T')[0],
      startTime: '09:00',
      endDate: new Date().toISOString().split('T')[0],
      endTime: '10:00',
      notes: '',
    });
    setConflictError(null);
  };

  // Sync Booking resourceId with activeResource
  useEffect(() => {
    if (activeResource) {
      setBookingForm(prev => ({ ...prev, resourceId: activeResource.id }));
    }
  }, [activeResource]);

  const handleBookingSubmit = (e) => {
    e.preventDefault();
    setConflictError(null);

    const startDateTime = new Date(`${bookingForm.startDate}T${bookingForm.startTime}:00`).toISOString();
    const endDateTime = new Date(`${bookingForm.endDate}T${bookingForm.endTime}:00`).toISOString();

    const payload = {
      resourceId: bookingForm.resourceId,
      employeeId: bookingForm.employeeId,
      departmentId: bookingForm.departmentId,
      title: bookingForm.title,
      purpose: bookingForm.purpose,
      startDateTime,
      endDateTime,
      notes: bookingForm.notes,
    };

    createBookingMutation.mutate(payload);
  };

  const handleResourceSubmit = (e) => {
    e.preventDefault();
    if (!resourceForm.name || !resourceForm.category) {
      addToast('error', 'Please fill in name and category');
      return;
    }
    const payload = {
      ...resourceForm,
      capacity: resourceForm.capacity ? parseInt(resourceForm.capacity) : null,
    };
    createResourceMutation.mutate(payload);
  };

  // Sync department when employee holder changes in reservation
  useEffect(() => {
    if (bookingForm.employeeId && employees) {
      const emp = employees.find(e => e.uuid === bookingForm.employeeId);
      if (emp?.departmentId) {
        setBookingForm(prev => ({ ...prev, departmentId: emp.departmentId }));
      }
    }
  }, [bookingForm.employeeId, employees]);

  const applySuggestedSlot = () => {
    if (!conflictError) return;
    const startObj = new Date(conflictError.suggestedStart);
    const endObj = new Date(conflictError.suggestedEnd);

    // format to YYYY-MM-DD
    const pad = (n) => String(n).padStart(2, '0');
    const startD = `${startObj.getFullYear()}-${pad(startObj.getMonth()+1)}-${pad(startObj.getDate())}`;
    const startT = `${pad(startObj.getHours())}:${pad(startObj.getMinutes())}`;
    const endD = `${endObj.getFullYear()}-${pad(endObj.getMonth()+1)}-${pad(endObj.getDate())}`;
    const endT = `${pad(endObj.getHours())}:${pad(endObj.getMinutes())}`;

    setBookingForm(prev => ({
      ...prev,
      startDate: startD,
      startTime: startT,
      endDate: endD,
      endTime: endT,
    }));
    setConflictError(null);
    addToast('info', 'Suggested slot values applied. Please click book again.');
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Meeting Rooms':
      case 'Conference Rooms':
        return DoorOpen;
      case 'Vehicles':
        return Car;
      case 'Shared Laptops':
        return Laptop;
      case 'Projectors':
      case 'Shared Equipment':
      default:
        return Monitor;
    }
  };

  // Date manipulation helpers
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getDaysArray = () => {
    if (calendarView === 'day') {
      return [new Date(currentDate)];
    }
    if (calendarView === 'week') {
      const startOfWeek = new Date(currentDate);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
      startOfWeek.setDate(diff);

      const days = [];
      for (let i = 0; i < 7; i++) {
        const nextDay = new Date(startOfWeek);
        nextDay.setDate(startOfWeek.getDate() + i);
        days.push(nextDay);
      }
      return days;
    }
    // Month view
    const daysInMonth = getDaysInMonth(currentDate);
    const days = [];
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
    }
    return days;
  };

  const changeDate = (direction) => {
    const newDate = new Date(currentDate);
    if (calendarView === 'day') {
      newDate.setDate(currentDate.getDate() + direction);
    } else if (calendarView === 'week') {
      newDate.setDate(currentDate.getDate() + (direction * 7));
    } else {
      newDate.setMonth(currentDate.getMonth() + direction);
    }
    setCurrentDate(newDate);
  };

  // Filter bookings for a specific day
  const getBookingsForDate = (date) => {
    if (!bookingsData) return [];
    return bookingsData.filter(b => {
      if (b.status === 'CANCELLED') return false;
      const bStart = new Date(b.startDateTime);
      const bEnd = new Date(b.endDateTime);
      const checkStart = new Date(date);
      checkStart.setHours(0, 0, 0, 0);
      const checkEnd = new Date(date);
      checkEnd.setHours(23, 59, 59, 999);

      return bStart <= checkEnd && bEnd >= checkStart;
    });
  };

  return (
    <DashboardLayout
      title="Shared Resource Booking"
      breadcrumbs={[{ label: 'Home', path: '/dashboard' }, { label: 'Resource Booking' }]}
    >
      <div className="p-6 md:p-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left column: Resources Directory */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-odoo-border rounded-card p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-sm text-odoo-textPrimary uppercase tracking-wider">Resources Directory</h2>
              {isAdminOrManager && (
                <button
                  onClick={() => { resetResourceForm(); setIsResourceDrawerOpen(true); }}
                  className="p-1.5 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors shadow"
                  title="Add new shared resource"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter controls */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search resources..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-odoo-border rounded-lg text-xs bg-odoo-bg focus-ring"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-odoo-border rounded-lg text-[11px] focus-ring font-semibold text-odoo-textPrimary bg-white"
                >
                  <option value="">All Categories</option>
                  <option value="Meeting Rooms">Meeting Rooms</option>
                  <option value="Conference Rooms">Conference Rooms</option>
                  <option value="Vehicles">Vehicles</option>
                  <option value="Projectors">Projectors</option>
                  <option value="Shared Laptops">Shared Laptops</option>
                  <option value="Shared Equipment">Shared Equipment</option>
                </select>

                <input
                  type="text"
                  placeholder="Location..."
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-odoo-border rounded-lg text-[11px] focus-ring bg-white"
                />
              </div>
            </div>
          </div>

          {/* Resource list container */}
          <div className="bg-white border border-odoo-border rounded-card shadow-sm overflow-hidden divide-y divide-odoo-border max-h-[500px] overflow-y-auto">
            {isResourcesLoading ? (
              <div className="p-6 text-center text-xs text-odoo-textSecondary">Loading resources...</div>
            ) : resourcesData?.length === 0 ? (
              <div className="p-8 text-center text-xs text-odoo-textSecondary italic">No resources found matching filter criteria.</div>
            ) : (
              resourcesData?.map((res) => {
                const Icon = getCategoryIcon(res.category);
                const isActive = activeResource?.id === res.id;
                return (
                  <div
                    key={res.id}
                    onClick={() => setActiveResource(res)}
                    className={`p-4 flex gap-3 cursor-pointer transition-colors ${
                      isActive ? 'bg-primary-light border-l-4 border-primary' : 'hover:bg-odoo-bg/50'
                    }`}
                  >
                    <div className={`p-2.5 rounded-lg border ${
                      isActive ? 'bg-white border-primary/20 text-primary' : 'bg-odoo-bg border-odoo-border text-gray-400'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-odoo-textPrimary truncate">{res.name}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          res.status === 'ACTIVE' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {res.status}
                        </span>
                      </div>
                      <span className="text-[10px] text-odoo-textSecondary block mt-0.5 truncate">{res.category}</span>
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400 font-semibold">
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-primary" /> {res.location || 'N/A'}</span>
                        {res.capacity && <span className="flex items-center gap-1"><Users className="w-3 h-3 text-orange-400" /> Max: {res.capacity}</span>}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right column: Scheduler & Booking Timeline */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Active Resource Details Header card */}
          {activeResource && (
            <div className="bg-white border border-odoo-border rounded-card p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider bg-primary-light/50 px-2 py-0.5 rounded border border-primary/20">
                  {activeResource.category}
                </span>
                <h1 className="text-base font-black text-odoo-textPrimary">{activeResource.name}</h1>
                <p className="text-xs text-odoo-textSecondary font-semibold flex items-center gap-3">
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-primary" /> {activeResource.location || 'Physical location not specified'}</span>
                  {activeResource.capacity && <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-orange-400" /> Capacity: up to {activeResource.capacity} persons</span>}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => { resetBookingForm(); setIsBookDrawerOpen(true); }}
                  disabled={!activeResource.bookable || activeResource.status !== 'ACTIVE'}
                  className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg flex items-center gap-2 shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  Reserve Slot
                </button>
              </div>
            </div>
          )}

          {/* Calendar Controller & Scheduler container */}
          <div className="bg-white border border-odoo-border rounded-card p-6 shadow-sm space-y-6">
            
            {/* View Selector controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-odoo-border">
              <div className="flex items-center gap-1.5 bg-odoo-bg border border-odoo-border p-1 rounded-lg">
                <button
                  onClick={() => setCalendarView('day')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                    calendarView === 'day' ? 'bg-white text-primary shadow-sm' : 'text-odoo-textSecondary hover:text-odoo-textPrimary'
                  }`}
                >
                  Day
                </button>
                <button
                  onClick={() => setCalendarView('week')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                    calendarView === 'week' ? 'bg-white text-primary shadow-sm' : 'text-odoo-textSecondary hover:text-odoo-textPrimary'
                  }`}
                >
                  Week
                </button>
                <button
                  onClick={() => setCalendarView('month')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                    calendarView === 'month' ? 'bg-white text-primary shadow-sm' : 'text-odoo-textSecondary hover:text-odoo-textPrimary'
                  }`}
                >
                  Month
                </button>
              </div>

              {/* Date navigation */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => changeDate(-1)}
                  className="p-2 border border-odoo-border rounded-lg bg-white hover:bg-gray-50 text-odoo-textSecondary"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-odoo-textPrimary min-w-[120px] text-center uppercase tracking-wide">
                  {calendarView === 'day' && currentDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                  {calendarView === 'week' && `Week of ${getDaysArray()[0]?.toLocaleDateString([], { month: 'short', day: 'numeric' })}`}
                  {calendarView === 'month' && currentDate.toLocaleDateString([], { month: 'long', year: 'numeric' })}
                </span>
                <button
                  onClick={() => changeDate(1)}
                  className="p-2 border border-odoo-border rounded-lg bg-white hover:bg-gray-50 text-odoo-textSecondary"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Grid Schedule representation */}
            <div className="space-y-4">
              {isBookingsLoading ? (
                <div className="py-12 text-center text-xs text-odoo-textSecondary">Loading scheduler booking slots...</div>
              ) : (
                <div className="divide-y divide-odoo-border">
                  {getDaysArray().map((date, idx) => {
                    const dayBookings = getBookingsForDate(date);
                    const isToday = new Date().toDateString() === date.toDateString();
                    return (
                      <div key={idx} className={`py-4 flex flex-col md:flex-row gap-4 items-start ${
                        isToday ? 'bg-primary-light/10 border-r-2 border-primary/30' : ''
                      }`}>
                        <div className="w-24 text-left shrink-0">
                          <span className={`text-[10px] font-black uppercase tracking-wider block ${isToday ? 'text-primary' : 'text-odoo-textSecondary'}`}>
                            {date.toLocaleDateString([], { weekday: 'short' })}
                          </span>
                          <span className={`text-xl font-black ${isToday ? 'text-primary' : 'text-odoo-textPrimary'}`}>
                            {date.getDate()}
                          </span>
                        </div>

                        <div className="flex-1 w-full space-y-2">
                          {dayBookings.length === 0 ? (
                            <span className="text-[11px] text-gray-400 italic block py-2">No bookings scheduled for this date.</span>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {dayBookings.map((b) => {
                                const start = new Date(b.startDateTime);
                                const end = new Date(b.endDateTime);
                                return (
                                  <div
                                    key={b.id}
                                    onClick={() => { setSelectedBooking(b); setIsDetailsOpen(true); }}
                                    className="p-3 bg-white border border-odoo-border hover:border-primary rounded-xl cursor-pointer shadow-sm transition-all hover:-translate-y-0.5 flex flex-col gap-1.5"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-xs text-odoo-textPrimary truncate">{b.title}</span>
                                      <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded ${
                                        b.status === 'UPCOMING' ? 'bg-blue-50 text-blue-700' :
                                        b.status === 'ONGOING' ? 'bg-orange-50 text-orange-700' : 'bg-green-50 text-green-700'
                                      }`}>
                                        {b.status}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10px] text-odoo-textSecondary font-semibold">
                                      <Clock className="w-3 h-3 text-primary shrink-0" />
                                      <span>
                                        {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>
                                    <span className="text-[9.5px] text-gray-400 font-medium">Holder: {b.employee.name}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

        </div>

      </div>

      {/* Book slot Drawer */}
      <Drawer
        isOpen={isBookDrawerOpen}
        onClose={() => { setIsBookDrawerOpen(false); resetBookingForm(); }}
        title={`Reserve ${activeResource?.name}`}
      >
        <form onSubmit={handleBookingSubmit} className="p-6 space-y-4 text-xs pb-20">
          
          {conflictError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-red-700">This resource is already booked.</p>
                  <p className="text-[10px] text-red-600">
                    Booked by: <span className="font-bold">{conflictError.bookedBy}</span> ({conflictError.title})
                  </p>
                  <p className="text-[10px] text-red-600">
                    Time Slot: <span className="font-mono">{conflictError.timeSlot}</span>
                  </p>
                </div>
              </div>
              <div className="border-t border-red-100 pt-2 flex items-center justify-between">
                <span className="text-[9px] font-bold text-red-600">Next available slot: {conflictError.suggestedSlot}</span>
                <button
                  type="button"
                  onClick={applySuggestedSlot}
                  className="px-2.5 py-1 bg-red-600 text-white rounded text-[10px] font-bold hover:bg-red-700 transition-colors"
                >
                  Use Suggestion
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="block font-bold text-odoo-textSecondary mb-1.5 uppercase">Booking Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Weekly Standup, Client demo, etc."
              value={bookingForm.title}
              onChange={(e) => setBookingForm(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring"
            />
          </div>

          <div>
            <label className="block font-bold text-odoo-textSecondary mb-1.5 uppercase">Purpose *</label>
            <textarea
              required
              rows="2"
              placeholder="Provide a brief explanation..."
              value={bookingForm.purpose}
              onChange={(e) => setBookingForm(prev => ({ ...prev, purpose: e.target.value }))}
              className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring"
            />
          </div>

          {isAdminOrManager ? (
            <div>
              <label className="block font-bold text-odoo-textSecondary mb-1.5 uppercase">Reserve For (Employee) *</label>
              <select
                value={bookingForm.employeeId}
                onChange={(e) => setBookingForm(prev => ({ ...prev, employeeId: e.target.value }))}
                className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring text-odoo-textPrimary font-semibold"
                required
              >
                <option value="">Select Employee</option>
                {employees?.map(emp => (
                  <option key={emp.uuid} value={emp.uuid}>
                    {emp.name} ({emp.email})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block font-bold text-odoo-textSecondary mb-1.5 uppercase">Employee Holder</label>
              <div className="w-full px-3 py-2 bg-odoo-bg border border-odoo-border rounded-lg text-sm text-odoo-textPrimary font-bold">
                {user?.name}
              </div>
            </div>
          )}

          <div>
            <label className="block font-bold text-odoo-textSecondary mb-1.5 uppercase">Department *</label>
            <select
              value={bookingForm.departmentId}
              onChange={(e) => setBookingForm(prev => ({ ...prev, departmentId: e.target.value }))}
              className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring text-odoo-textPrimary font-semibold"
              required
            >
              <option value="">Select Department</option>
              {departments?.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-odoo-textSecondary mb-1.5 uppercase">Start Date *</label>
              <input
                type="date"
                required
                value={bookingForm.startDate}
                onChange={(e) => setBookingForm(prev => ({ ...prev, startDate: e.target.value, endDate: e.target.value }))}
                className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring"
              />
            </div>
            <div>
              <label className="block font-bold text-odoo-textSecondary mb-1.5 uppercase">Start Time *</label>
              <input
                type="time"
                required
                value={bookingForm.startTime}
                onChange={(e) => setBookingForm(prev => ({ ...prev, startTime: e.target.value }))}
                className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-odoo-textSecondary mb-1.5 uppercase">End Date *</label>
              <input
                type="date"
                required
                value={bookingForm.endDate}
                onChange={(e) => setBookingForm(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring"
              />
            </div>
            <div>
              <label className="block font-bold text-odoo-textSecondary mb-1.5 uppercase">End Time *</label>
              <input
                type="time"
                required
                value={bookingForm.endTime}
                onChange={(e) => setBookingForm(prev => ({ ...prev, endTime: e.target.value }))}
                className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-odoo-textSecondary mb-1.5 uppercase">Notes / Additional Info</label>
            <textarea
              rows="2"
              placeholder="Specify requirements, etc."
              value={bookingForm.notes}
              onChange={(e) => setBookingForm(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring"
            />
          </div>

          <div className="absolute bottom-0 right-0 max-w-md w-full bg-white border-t border-odoo-border p-4 flex gap-3 z-10 shrink-0">
            <button
              type="button"
              onClick={() => setIsBookDrawerOpen(false)}
              className="flex-1 py-2.5 border border-odoo-border text-odoo-textPrimary hover:bg-gray-50 text-xs font-bold rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createBookingMutation.isPending}
              className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5"
            >
              {createBookingMutation.isPending && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
              Confirm Reservation
            </button>
          </div>
        </form>
      </Drawer>

      {/* Resource Registration Drawer */}
      <Drawer
        isOpen={isResourceDrawerOpen}
        onClose={() => { setIsResourceDrawerOpen(false); resetResourceForm(); }}
        title="Register New Shared Resource"
      >
        <form onSubmit={handleResourceSubmit} className="p-6 space-y-4 text-xs pb-20">
          <div>
            <label className="block font-bold text-odoo-textSecondary mb-1.5 uppercase">Resource Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Conference Room A, Ford Transit Van"
              value={resourceForm.name}
              onChange={(e) => setResourceForm(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring"
            />
          </div>

          <div>
            <label className="block font-bold text-odoo-textSecondary mb-1.5 uppercase">Category *</label>
            <select
              value={resourceForm.category}
              onChange={(e) => setResourceForm(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring text-odoo-textPrimary font-semibold"
              required
            >
              <option value="Meeting Rooms">Meeting Rooms</option>
              <option value="Conference Rooms">Conference Rooms</option>
              <option value="Vehicles">Vehicles</option>
              <option value="Projectors">Projectors</option>
              <option value="Shared Laptops">Shared Laptops</option>
              <option value="Shared Equipment">Shared Equipment</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-odoo-textSecondary mb-1.5 uppercase">Physical Location</label>
            <input
              type="text"
              placeholder="e.g. Block B, 2nd Floor, Room 204"
              value={resourceForm.location}
              onChange={(e) => setResourceForm(prev => ({ ...prev, location: e.target.value }))}
              className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-odoo-textSecondary mb-1.5 uppercase">Max Capacity</label>
              <input
                type="number"
                placeholder="e.g. 10 (seats)"
                value={resourceForm.capacity}
                onChange={(e) => setResourceForm(prev => ({ ...prev, capacity: e.target.value }))}
                className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring"
              />
            </div>
            <div>
              <label className="block font-bold text-odoo-textSecondary mb-1.5 uppercase">Category Department</label>
              <select
                value={resourceForm.departmentId}
                onChange={(e) => setResourceForm(prev => ({ ...prev, departmentId: e.target.value }))}
                className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring"
              >
                <option value="">None (Global)</option>
                {departments?.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-odoo-textSecondary mb-1.5 uppercase">Resource Description</label>
            <textarea
              rows="3"
              placeholder="Add physical specs, instructions, etc."
              value={resourceForm.description}
              onChange={(e) => setResourceForm(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring"
            />
          </div>

          <div className="absolute bottom-0 right-0 max-w-md w-full bg-white border-t border-odoo-border p-4 flex gap-3 z-10 shrink-0">
            <button
              type="button"
              onClick={() => setIsResourceDrawerOpen(false)}
              className="flex-1 py-2.5 border border-odoo-border text-odoo-textPrimary hover:bg-gray-50 text-xs font-bold rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createResourceMutation.isPending}
              className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5"
            >
              {createResourceMutation.isPending && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
              Register Resource
            </button>
          </div>
        </form>
      </Drawer>

      {/* Booking Details Modal */}
      {isDetailsOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsDetailsOpen(false)}></div>
          <div className="relative bg-white border border-odoo-border rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 animate-scale-in">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-primary bg-primary-light border border-primary/20 px-2 py-0.5 rounded">
                  {selectedBooking.resource.category}
                </span>
                <h3 className="text-sm font-black text-odoo-textPrimary">{selectedBooking.title}</h3>
              </div>
              <button onClick={() => setIsDetailsOpen(false)} className="p-1 hover:bg-gray-100 rounded-md text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-odoo-bg border border-odoo-border rounded-xl p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-odoo-textSecondary">Resource:</span>
                <span className="font-bold text-odoo-textPrimary">{selectedBooking.resource.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-odoo-textSecondary">Booked By:</span>
                <span className="font-bold text-odoo-textPrimary">{selectedBooking.employee.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-odoo-textSecondary">Department:</span>
                <span className="font-bold text-odoo-textPrimary">{selectedBooking.department.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-odoo-textSecondary">Duration:</span>
                <span className="font-bold text-primary">
                  {new Date(selectedBooking.startDateTime).toLocaleString()} - {new Date(selectedBooking.endDateTime).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-odoo-textSecondary">Status:</span>
                <span className={`font-bold uppercase ${
                  selectedBooking.status === 'UPCOMING' ? 'text-blue-600' :
                  selectedBooking.status === 'ONGOING' ? 'text-orange-600' : 'text-green-600'
                }`}>{selectedBooking.status}</span>
              </div>
              {selectedBooking.purpose && (
                <div className="border-t border-odoo-border pt-2 mt-2">
                  <span className="text-odoo-textSecondary block font-bold mb-1">Purpose:</span>
                  <span className="text-odoo-textPrimary block italic font-semibold">"{selectedBooking.purpose}"</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              {/* Cancellation */}
              {selectedBooking.status === 'UPCOMING' && (
                <button
                  onClick={() => cancelBookingMutation.mutate(selectedBooking.id)}
                  disabled={cancelBookingMutation.isPending}
                  className="flex-1 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors"
                >
                  Cancel Booking
                </button>
              )}

              {/* Duplication */}
              <button
                onClick={() => {
                  const now = new Date();
                  const start = new Date(now.getTime() + 24 * 60 * 60 * 1000); // tomorrow same time
                  const end = new Date(start.getTime() + 60 * 60 * 1000); // + 1 hour
                  duplicateBookingMutation.mutate({
                    resourceId: selectedBooking.resourceId,
                    employeeId: selectedBooking.employeeId,
                    departmentId: selectedBooking.departmentId,
                    title: `Duplicate - ${selectedBooking.title}`,
                    purpose: selectedBooking.purpose,
                    startDateTime: start.toISOString(),
                    endDateTime: end.toISOString(),
                    notes: selectedBooking.notes,
                  });
                }}
                disabled={duplicateBookingMutation.isPending}
                className="flex-1 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary-hover transition-colors flex items-center justify-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                Duplicate
              </button>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
};

export default ResourceBooking;
