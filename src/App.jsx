import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useParams, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot, query, doc, updateDoc, where, orderBy, limit } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { 
  Wrench, Zap, Sparkles, Hammer, Search, Star, ShieldCheck, Clock, CheckCircle2, X, 
  ChevronRight, Calendar, MapPin, User, ArrowRight, MessageSquare, Bell, LayoutDashboard, 
  LogOut, Filter, ChevronDown, Send, UserCircle2, Briefcase, Plus, Image as ImageIcon,
  ThumbsUp, Menu, MoreVertical, Settings, Home, HardHat
} from 'lucide-react';

// --- FIREBASE CONFIG ---
let db = null;
let auth = null;
try {
  const firebaseConfig = JSON.parse(process.env.REACT_APP_FIREBASE_CONFIG || '{}');
  if (Object.keys(firebaseConfig).length > 0) {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
  }
} catch (e) {
  console.warn("Firebase configuration is missing. Bookings and chat will be simulated locally.");
}

// --- CONSTANTS & MOCK DATA ---
const SERVICES = [
  { id: 'plumbing', name: 'Plumbing', icon: Wrench, color: 'text-blue-500', bg: 'bg-blue-50', description: 'Leaks, clogs, installations, and repairs.' },
  { id: 'electrical', name: 'Electrical', icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-50', description: 'Wiring, fixtures, panels, and troubleshooting.' },
  { id: 'cleaning', name: 'Cleaning', icon: Sparkles, color: 'text-green-500', bg: 'bg-green-50', description: 'Standard, deep, and move-in/out cleaning.' },
  { id: 'handyman', name: 'Handyman', icon: Hammer, color: 'text-orange-500', bg: 'bg-orange-50', description: 'Furniture assembly, mounting, general repairs.' },
];

const JOBS = {
  plumbing: [
    { id: 'p1', name: 'Fix a Leaky Faucet', price: 120, estimatedTime: '1-2 hours' },
    { id: 'p2', name: 'Unclog a Drain', price: 150, estimatedTime: '1-2 hours' },
    { id: 'p3', name: 'Install a Toilet', price: 250, estimatedTime: '2-3 hours' },
    { id: 'p4', name: 'Water Heater Diagnostic', price: 89, estimatedTime: '1 hour' },
  ],
  electrical: [
    { id: 'e1', name: 'Install Light Fixture', price: 130, estimatedTime: '1-2 hours' },
    { id: 'e2', name: 'Replace Outlet/Switch', price: 95, estimatedTime: '1 hour' },
    { id: 'e3', name: 'Ceiling Fan Installation', price: 180, estimatedTime: '2 hours' },
    { id: 'e4', name: 'Electrical Diagnostic', price: 89, estimatedTime: '1 hour' },
  ],
  cleaning: [
    { id: 'c1', name: 'Standard Home Cleaning (2 Bed, 1 Bath)', price: 140, estimatedTime: '2-3 hours' },
    { id: 'c2', name: 'Deep Cleaning (2 Bed, 1 Bath)', price: 220, estimatedTime: '4-5 hours' },
    { id: 'c3', name: 'Move-in/Move-out Cleaning', price: 300, estimatedTime: '5-6 hours' },
  ],
  handyman: [
    { id: 'h1', name: 'TV Mounting (Up to 55")', price: 110, estimatedTime: '1-2 hours' },
    { id: 'h2', name: 'Furniture Assembly (Medium)', price: 90, estimatedTime: '1-2 hours' },
    { id: 'h3', name: 'Hang Pictures or Shelves', price: 85, estimatedTime: '1 hour' },
    { id: 'h4', name: 'Drywall Repair (Small Hole)', price: 150, estimatedTime: '2 hours' },
  ]
};

const MOCK_PRO = {
  id: 'pro123',
  name: 'John Miller',
  rating: 4.9,
  reviews: 128,
  image: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=400&h=400&fit=crop',
  services: ['plumbing', 'handyman']
};

const MOCK_CHATS = [
  { id: 'msg1', sender: 'system', text: 'Booking confirmed! A professional will contact you soon.', time: '10:00 AM' },
  { id: 'msg2', sender: 'pro', text: 'Hi! I can help with your leaky faucet. I will be there at 10 AM.', time: '10:05 AM' },
];

// --- HELPERS ---
const getStatusColor = (status) => {
  switch (status) {
    case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'accepted': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'in-progress': return 'bg-purple-100 text-purple-700 border-purple-200';
    case 'completed': return 'bg-green-100 text-green-700 border-green-200';
    default: return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

// --- COMPONENTS ---

const Navbar = ({ role, setRole }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <nav className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-[60] h-16">
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-200">
            <Wrench className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-black text-gray-900 tracking-tight">ServiceFlow</span>
        </Link>
        
        <div className="hidden md:flex items-center space-x-8">
          <Link to="/" className="text-gray-600 hover:text-blue-600 font-semibold transition-colors">Find Pros</Link>
          <Link to="/dashboard" className="text-gray-600 hover:text-blue-600 font-semibold transition-colors flex items-center gap-2">
            My Dashboard
            <span className="bg-blue-600 w-2 h-2 rounded-full"></span>
          </Link>
          <div className="h-6 w-[1px] bg-gray-200"></div>
          <button 
            onClick={() => setRole(role === 'customer' ? 'pro' : 'customer')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold transition-all shadow-sm ${
              role === 'customer' 
                ? 'bg-blue-50 text-blue-600 border border-blue-100' 
                : 'bg-orange-50 text-orange-600 border border-orange-100'
            }`}
          >
            {role === 'customer' ? <Briefcase className="w-4 h-4" /> : <UserCircle2 className="w-4 h-4" />}
            Switch to {role === 'customer' ? 'Pro' : 'Customer'} Mode
          </button>
        </div>

        <div className="flex items-center space-x-4">
          <button className="p-2 text-gray-400 hover:text-gray-900 relative">
            <Bell className="w-6 h-6" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold border-2 border-white shadow-md">
            {role === 'customer' ? 'JD' : 'JM'}
          </div>
        </div>
      </div>
    </nav>
  );
};

// --- VIEWS ---

const LandingPage = ({ setSelectedService }) => (
  <motion.div 
    initial={{ opacity: 0 }} 
    animate={{ opacity: 1 }}
    className="pb-20"
  >
    {/* Hero */}
    <div className="relative overflow-hidden bg-gradient-to-b from-blue-50 to-white pt-20 pb-28 md:pt-32 md:pb-40">
      <div className="max-w-7xl mx-auto px-4 relative z-10 text-center">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-blue-100 text-blue-600 font-bold text-sm mb-6 tracking-wide uppercase">
            Home Services Reinvented
          </span>
          <h1 className="text-5xl md:text-7xl font-black text-gray-900 mb-8 tracking-tight leading-[1.1]">
            Expert help, <span className="text-blue-600">on demand.</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
            Stop waiting for callbacks. See upfront prices, pick a top-rated pro, and book in seconds. 
            <span className="font-bold text-gray-900"> Guaranteed satisfaction.</span>
          </p>
        </motion.div>
        
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="max-w-2xl mx-auto relative group"
        >
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
            <Search className="h-6 w-6 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
          </div>
          <input 
            type="text" 
            className="block w-full pl-14 pr-4 py-5 rounded-2xl border-2 border-gray-100 text-lg shadow-2xl shadow-blue-200/50 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:outline-none transition-all placeholder:text-gray-400" 
            placeholder="Search for a service (e.g. 'unclog sink')"
          />
          <button className="absolute inset-y-3 right-3 bg-blue-600 hover:bg-blue-700 text-white px-8 rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20 active:scale-95">
            Get Pricing
          </button>
        </motion.div>
        
        <div className="mt-16 flex flex-wrap items-center justify-center gap-x-12 gap-y-6 text-gray-500 font-semibold uppercase tracking-widest text-xs">
          <div className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-green-500" /> Fully Insured</div>
          <div className="flex items-center gap-2"><Clock className="w-5 h-5 text-blue-500" /> Fixed Prices</div>
          <div className="flex items-center gap-2"><ThumbsUp className="w-5 h-5 text-purple-500" /> 5-Star Reviews</div>
        </div>
      </div>
      
      {/* Decorative blobs */}
      <div className="absolute -top-20 -right-20 w-96 h-96 bg-blue-100 rounded-full blur-[100px] opacity-50"></div>
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-100 rounded-full blur-[100px] opacity-50"></div>
    </div>

    {/* Categories */}
    <div className="max-w-7xl mx-auto px-4 -mt-16 relative z-20">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {SERVICES.map((service, i) => {
          const Icon = service.icon;
          return (
            <motion.div 
              key={service.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
              onClick={() => setSelectedService(service)}
              className="group p-8 rounded-3xl bg-white border border-gray-100 shadow-xl shadow-gray-200/50 cursor-pointer hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-2 transition-all"
            >
              <div className={`w-16 h-16 rounded-2xl ${service.bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                <Icon className={`w-8 h-8 ${service.color}`} />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">{service.name}</h3>
              <p className="text-gray-500 leading-relaxed mb-6">{service.description}</p>
              <div className="flex items-center text-blue-600 font-bold group-hover:gap-3 gap-2 transition-all">
                See Pricing <ArrowRight className="w-5 h-5" />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  </motion.div>
);

const Dashboard = ({ role, bookings, setBookings }) => {
  const navigate = useNavigate();
  
  const stats = useMemo(() => {
    if (role === 'customer') {
      return [
        { label: 'Active Bookings', value: bookings.filter(b => b.status !== 'completed').length, icon: Clock, color: 'text-blue-600' },
        { label: 'Completed', value: bookings.filter(b => b.status === 'completed').length, icon: CheckCircle2, color: 'text-green-600' },
        { label: 'Total Spent', value: `$${bookings.reduce((sum, b) => sum + (b.status === 'completed' ? b.price : 0), 0)}`, icon: ThumbsUp, color: 'text-purple-600' }
      ];
    } else {
      return [
        { label: 'Incoming Leads', value: 3, icon: Bell, color: 'text-orange-600' },
        { label: 'Active Jobs', value: bookings.filter(b => b.status !== 'completed').length, icon: Briefcase, color: 'text-blue-600' },
        { label: 'Earnings', value: `$${bookings.reduce((sum, b) => sum + (b.status === 'completed' ? b.price : 0), 0)}`, icon: Zap, color: 'text-yellow-600' }
      ];
    }
  }, [role, bookings]);

  const updateStatus = async (bookingId, newStatus) => {
    // Simulate or update Firestore
    const updated = bookings.map(b => b.id === bookingId ? { ...b, status: newStatus } : b);
    setBookings(updated);
    if (db) {
      try {
        await updateDoc(doc(db, 'bookings', bookingId), { status: newStatus });
      } catch (e) { console.error(e); }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">
            Welcome back, {role === 'customer' ? 'John' : 'Miller'}!
          </h1>
          <p className="text-gray-500 mt-2 font-medium">Here is what is happening with your {role === 'customer' ? 'home' : 'business'} today.</p>
        </div>
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white border border-gray-200 font-bold hover:bg-gray-50 transition-colors">
            <Filter className="w-5 h-5" /> Filter
          </button>
          <button 
            onClick={() => role === 'customer' ? navigate('/') : null}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
          >
            <Plus className="w-5 h-5" /> {role === 'customer' ? 'Book New Service' : 'Go Online'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-gray-100/50 flex items-center gap-6">
            <div className={`w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center`}>
              <stat.icon className={`w-8 h-8 ${stat.color}`} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">{stat.label}</p>
              <h3 className="text-3xl font-black text-gray-900">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Bookings List */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-2xl shadow-gray-200/50 overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between">
          <h2 className="text-xl font-black text-gray-900">
            {role === 'customer' ? 'Recent Activity' : 'My Jobs'}
          </h2>
          <button className="text-blue-600 font-bold hover:underline">View All</button>
        </div>
        
        <div className="divide-y divide-gray-50">
          {bookings.length === 0 ? (
            <div className="p-20 text-center">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <LayoutDashboard className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">No bookings yet</h3>
              <p className="text-gray-500 mt-2">When you {role === 'customer' ? 'book a service' : 'accept a job'}, it will show up here.</p>
            </div>
          ) : (
            bookings.map((booking) => (
              <div key={booking.id} className="p-8 hover:bg-gray-50/50 transition-colors group">
                <div className="flex flex-col lg:flex-row gap-8 lg:items-center">
                  <div className="flex-grow">
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border-2 ${getStatusColor(booking.status)}`}>
                        {booking.status}
                      </span>
                      <span className="text-sm text-gray-400 font-medium">• Booked on {new Date(booking.createdAt).toLocaleDateString()}</span>
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 mb-2">{booking.job}</h3>
                    <div className="flex flex-wrap gap-6 text-sm font-semibold text-gray-500">
                      <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-blue-500" /> {booking.address}</div>
                      <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-orange-500" /> {booking.date} at {booking.time}</div>
                      <div className="flex items-center gap-2"><User className="w-4 h-4 text-purple-500" /> {role === 'customer' ? 'Pro: John Miller' : `Client: ${booking.name}`}</div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="text-right mr-4 hidden sm:block">
                      <div className="text-2xl font-black text-gray-900">${booking.price}</div>
                      <div className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Paid via Card</div>
                    </div>
                    
                    <Link to={`/booking/${booking.id}`} className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-white border-2 border-gray-100 font-bold hover:border-blue-500 hover:text-blue-600 transition-all shadow-sm">
                      <MessageSquare className="w-5 h-5" /> Chat
                    </Link>

                    {role === 'pro' && booking.status === 'pending' && (
                      <button 
                        onClick={() => updateStatus(booking.id, 'accepted')}
                        className="px-8 py-4 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                      >
                        Accept Job
                      </button>
                    )}

                    {role === 'pro' && booking.status === 'accepted' && (
                      <button 
                        onClick={() => updateStatus(booking.id, 'in-progress')}
                        className="px-8 py-4 rounded-2xl bg-purple-600 text-white font-bold hover:bg-purple-700 transition-all shadow-lg shadow-purple-200"
                      >
                        Start Job
                      </button>
                    )}

                    {role === 'pro' && booking.status === 'in-progress' && (
                      <button 
                        onClick={() => updateStatus(booking.id, 'completed')}
                        className="px-8 py-4 rounded-2xl bg-green-600 text-white font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-200"
                      >
                        Complete Job
                      </button>
                    )}

                    {role === 'customer' && booking.status === 'completed' && (
                      <button className="px-8 py-4 rounded-2xl bg-gray-900 text-white font-bold hover:bg-black transition-all shadow-lg">
                        Leave Review
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const BookingDetails = ({ role, bookings }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const booking = bookings.find(b => b.id === id);
  const [messages, setMessages] = useState(MOCK_CHATS);
  const [newMsg, setNewMsg] = useState('');
  
  if (!booking) return <div className="p-20 text-center">Booking not found</div>;

  const handleSend = () => {
    if (!newMsg.trim()) return;
    const msg = {
      id: Date.now().toString(),
      sender: role === 'customer' ? 'customer' : 'pro',
      text: newMsg,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages([...messages, msg]);
    setNewMsg('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 font-bold mb-8 hover:text-gray-900">
        <ArrowRight className="w-5 h-5 rotate-180" /> Back to Dashboard
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chat Area */}
        <div className="lg:col-span-2 flex flex-col bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl h-[700px] overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-white/50 backdrop-blur-md">
            <div className="flex items-center gap-4">
              <img src={MOCK_PRO.image} className="w-12 h-12 rounded-full border-2 border-white shadow-md" alt="" />
              <div>
                <h3 className="font-black text-gray-900">{role === 'customer' ? MOCK_PRO.name : booking.name}</h3>
                <div className="flex items-center gap-2 text-xs font-bold text-green-500 uppercase tracking-widest">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Online
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-3 rounded-xl bg-gray-50 text-gray-500 hover:text-gray-900 transition-colors"><Bell className="w-5 h-5" /></button>
              <button className="p-3 rounded-xl bg-gray-50 text-gray-500 hover:text-gray-900 transition-colors"><MoreVertical className="w-5 h-5" /></button>
            </div>
          </div>

          <div className="flex-grow p-8 overflow-y-auto space-y-6 bg-gray-50/30">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.sender === (role === 'customer' ? 'customer' : 'pro') ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl p-4 shadow-sm ${
                  m.sender === 'system' 
                    ? 'bg-gray-100 text-gray-600 text-center mx-auto' 
                    : m.sender === (role === 'customer' ? 'customer' : 'pro')
                      ? 'bg-blue-600 text-white rounded-tr-none' 
                      : 'bg-white text-gray-900 border border-gray-100 rounded-tl-none'
                }`}>
                  <p className="font-medium">{m.text}</p>
                  <span className={`text-[10px] font-bold uppercase tracking-widest mt-2 block ${m.sender === (role === 'customer' ? 'customer' : 'pro') ? 'text-blue-200' : 'text-gray-400'}`}>
                    {m.time}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-6 bg-white border-t border-gray-100">
            <div className="relative flex items-center gap-4">
              <button className="p-3 rounded-xl bg-gray-50 text-gray-400 hover:text-gray-600"><ImageIcon className="w-6 h-6" /></button>
              <input 
                type="text" 
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type your message..."
                className="flex-grow bg-gray-50 border-none rounded-2xl px-6 py-4 focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all font-medium"
              />
              <button 
                onClick={handleSend}
                className="bg-blue-600 text-white p-4 rounded-2xl shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all"
              >
                <Send className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Info Sidebar */}
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                <Wrench className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <h4 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Job Details</h4>
            <h2 className="text-3xl font-black text-gray-900 mb-2">{booking.job}</h2>
            <div className={`inline-block px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border-2 ${getStatusColor(booking.status)} mb-8`}>
              {booking.status}
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center"><Calendar className="w-5 h-5 text-gray-400" /></div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Date & Time</p>
                  <p className="font-bold text-gray-900">{booking.date} at {booking.time}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center"><MapPin className="w-5 h-5 text-gray-400" /></div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Address</p>
                  <p className="font-bold text-gray-900">{booking.address}</p>
                </div>
              </div>
            </div>
            
            <div className="mt-8 pt-8 border-t border-gray-50 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Price</p>
                <p className="text-3xl font-black text-gray-900">${booking.price}</p>
              </div>
              <button className="p-4 rounded-2xl bg-gray-50 text-gray-400 hover:text-gray-900 transition-colors"><Plus className="w-6 h-6" /></button>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-900 to-black p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
            <div className="relative z-10">
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Your Professional</h4>
              <div className="flex items-center gap-4 mb-6">
                <img src={MOCK_PRO.image} className="w-16 h-16 rounded-2xl object-cover border-2 border-white/20" alt="" />
                <div>
                  <h3 className="text-xl font-black tracking-tight">{MOCK_PRO.name}</h3>
                  <div className="flex items-center gap-2 text-yellow-500">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="font-bold">{MOCK_PRO.rating}</span>
                    <span className="text-xs font-medium text-gray-400">({MOCK_PRO.reviews} reviews)</span>
                  </div>
                </div>
              </div>
              <button className="w-full py-4 rounded-2xl bg-white text-black font-black hover:bg-gray-100 transition-all flex items-center justify-center gap-2">
                View Profile <ArrowRight className="w-5 h-5" />
              </button>
            </div>
            {/* Background pattern */}
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-24 h-24" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- MAIN WRAPPER ---

export default function App() {
  const [role, setRole] = useState('customer'); // 'customer' or 'pro'
  const [bookings, setBookings] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [bookingStep, setBookingStep] = useState(0);
  const [selectedJob, setSelectedJob] = useState(null);
  const [bookingData, setBookingData] = useState({ date: '', time: '', name: '', address: '', notes: '' });

  // Sync with Firestore
  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBookings(docs);
    });
    return () => unsubscribe();
  }, []);

  const handleJobSelect = (job) => {
    setSelectedJob(job);
    setBookingStep(1);
  };

  const submitBooking = async () => {
    const finalBooking = {
      job: selectedJob.name,
      price: selectedJob.price,
      serviceCategory: selectedService.name,
      ...bookingData,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    if (db) {
      await addDoc(collection(db, 'bookings'), finalBooking);
    } else {
      setBookings([{ id: Date.now().toString(), ...finalBooking }, ...bookings]);
    }
    setBookingStep(3);
  };

  const closeBooking = () => {
    setBookingStep(0);
    setSelectedJob(null);
    setSelectedService(null);
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
        <Navbar role={role} setRole={setRole} />
        
        <Routes>
          <Route path="/" element={
            <LandingPage setSelectedService={setSelectedService} />
          } />
          
          <Route path="/dashboard" element={
            <Dashboard role={role} bookings={bookings} setBookings={setBookings} />
          } />

          <Route path="/booking/:id" element={
            <BookingDetails role={role} bookings={bookings} />
          } />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>

        {/* Service Details Overlay (Modal-like behavior on landing) */}
        <AnimatePresence>
          {selectedService && bookingStep === 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-gray-900/40 backdrop-blur-xl flex items-end md:items-center justify-center p-4"
              onClick={() => setSelectedService(null)}
            >
              <motion.div 
                initial={{ y: 100, scale: 0.95 }}
                animate={{ y: 0, scale: 1 }}
                exit={{ y: 100, scale: 0.95 }}
                className="bg-white rounded-[2.5rem] w-full max-w-4xl shadow-2xl overflow-hidden"
                onClick={e => e.stopPropagation()}
              >
                <div className="p-8 md:p-12">
                  <div className="flex items-center justify-between mb-12">
                    <div className="flex items-center gap-6">
                      <div className={`p-4 rounded-2xl ${selectedService.bg}`}>
                        <selectedService.icon className={`w-10 h-10 ${selectedService.color}`} />
                      </div>
                      <div>
                        <h2 className="text-4xl font-black text-gray-900 tracking-tight">{selectedService.name} Services</h2>
                        <p className="text-gray-500 font-medium text-lg mt-1">Select a task for instant pricing.</p>
                      </div>
                    </div>
                    <button onClick={() => setSelectedService(null)} className="p-3 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors">
                      <X className="w-8 h-8" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {JOBS[selectedService.id].map(job => (
                      <div key={job.id} className="group p-6 rounded-3xl border-2 border-gray-50 bg-gray-50/30 hover:bg-white hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10 transition-all flex items-center justify-between gap-6 cursor-pointer" onClick={() => handleJobSelect(job)}>
                        <div>
                          <h4 className="text-xl font-black text-gray-900 mb-1">{job.name}</h4>
                          <div className="flex items-center gap-2 text-sm font-bold text-gray-400">
                            <Clock className="w-4 h-4" /> {job.estimatedTime}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-black text-gray-900">${job.price}</div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-green-600 bg-green-50 px-2 py-0.5 rounded-full inline-block">Fixed Price</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Booking Flow Modal */}
          {bookingStep > 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] bg-gray-900/60 backdrop-blur-md flex items-center justify-center p-4"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl relative overflow-hidden"
              >
                <button onClick={closeBooking} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-900 transition-colors z-10"><X className="w-6 h-6" /></button>
                
                <div className="p-10">
                  {bookingStep !== 3 && (
                    <div className="mb-10">
                      <div className="flex items-center justify-between mb-6">
                        <span className="px-4 py-1.5 rounded-full bg-blue-50 text-blue-600 text-xs font-black uppercase tracking-widest">Step {bookingStep} of 2</span>
                        <span className="text-3xl font-black text-gray-900">${selectedJob?.price}</span>
                      </div>
                      <h3 className="text-3xl font-black text-gray-900 tracking-tight">{selectedJob?.name}</h3>
                      <p className="text-gray-500 mt-2 font-medium flex items-center gap-2"><Clock className="w-5 h-5" /> {selectedJob?.estimatedTime}</p>
                    </div>
                  )}

                  {bookingStep === 1 && (
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <div className="relative">
                          <Calendar className="absolute left-4 top-4.5 w-6 h-6 text-gray-400" />
                          <input type="date" value={bookingData.date} onChange={e => setBookingData({...bookingData, date: e.target.value})} className="w-full pl-14 pr-4 py-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-4 focus:ring-blue-100 transition-all" />
                        </div>
                        <select value={bookingData.time} onChange={e => setBookingData({...bookingData, time: e.target.value})} className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-4 focus:ring-blue-100 transition-all appearance-none">
                          <option value="">Select Time Preference</option>
                          <option value="morning">Morning (8am - 12pm)</option>
                          <option value="afternoon">Afternoon (12pm - 4pm)</option>
                          <option value="evening">Evening (4pm - 8pm)</option>
                        </select>
                      </div>
                      <button disabled={!bookingData.date || !bookingData.time} onClick={() => setBookingStep(2)} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-xl shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                        Next Step <ArrowRight className="w-6 h-6" />
                      </button>
                    </div>
                  )}

                  {bookingStep === 2 && (
                    <div className="space-y-4">
                      <div className="relative">
                        <User className="absolute left-4 top-4.5 w-6 h-6 text-gray-400" />
                        <input type="text" placeholder="Full Name" value={bookingData.name} onChange={e => setBookingData({...bookingData, name: e.target.value})} className="w-full pl-14 pr-4 py-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-4 focus:ring-blue-100 transition-all" />
                      </div>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-4.5 w-6 h-6 text-gray-400" />
                        <input type="text" placeholder="Service Address" value={bookingData.address} onChange={e => setBookingData({...bookingData, address: e.target.value})} className="w-full pl-14 pr-4 py-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-4 focus:ring-blue-100 transition-all" />
                      </div>
                      <textarea placeholder="Any special instructions?" rows="3" value={bookingData.notes} onChange={e => setBookingData({...bookingData, notes: e.target.value})} className="w-full p-6 bg-gray-50 border-none rounded-2xl font-bold focus:ring-4 focus:ring-blue-100 transition-all resize-none"></textarea>
                      <button onClick={submitBooking} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-xl shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2 mt-4">
                        Confirm & Pay <ShieldCheck className="w-6 h-6" />
                      </button>
                    </div>
                  )}

                  {bookingStep === 3 && (
                    <div className="text-center py-6">
                      <div className="w-24 h-24 bg-green-100 rounded-[2rem] flex items-center justify-center mx-auto mb-8 animate-bounce">
                        <CheckCircle2 className="w-12 h-12 text-green-500" />
                      </div>
                      <h3 className="text-4xl font-black text-gray-900 tracking-tight mb-4">You're All Set!</h3>
                      <p className="text-lg text-gray-500 font-medium mb-10 leading-relaxed">
                        Your booking for <span className="text-gray-900 font-bold">{selectedJob?.name}</span> is confirmed. Check your dashboard to chat with your pro.
                      </p>
                      <button onClick={() => { closeBooking(); navigate('/dashboard'); }} className="w-full bg-gray-900 text-white py-5 rounded-2xl font-black text-xl hover:bg-black transition-all shadow-xl shadow-gray-200">
                        Go to Dashboard
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <footer className="bg-white border-t border-gray-100 py-20 mt-auto">
          <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="col-span-1 md:col-span-2">
              <Link to="/" className="flex items-center space-x-2 mb-8">
                <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-200">
                  <Wrench className="w-5 h-5 text-white" />
                </div>
                <span className="text-2xl font-black text-gray-900 tracking-tight">ServiceFlow</span>
              </Link>
              <p className="text-gray-500 text-lg max-w-sm mb-8 leading-relaxed font-medium">
                The most trusted platform for high-quality home services. Vetted pros, upfront pricing, and 100% satisfaction guaranteed.
              </p>
              <div className="flex gap-4">
                {['Twitter', 'Instagram', 'Facebook', 'LinkedIn'].map(s => <div key={s} className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center font-bold text-gray-400 hover:text-blue-600 cursor-pointer transition-colors border border-gray-100">{s[0]}</div>)}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-8">Platform</h4>
              <ul className="space-y-4 font-bold text-gray-500">
                <li className="hover:text-blue-600 cursor-pointer transition-colors">How it works</li>
                <li className="hover:text-blue-600 cursor-pointer transition-colors">Pricing</li>
                <li className="hover:text-blue-600 cursor-pointer transition-colors">Guarantee</li>
                <li className="hover:text-blue-600 cursor-pointer transition-colors">Pros</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-8">Company</h4>
              <ul className="space-y-4 font-bold text-gray-500">
                <li className="hover:text-blue-600 cursor-pointer transition-colors">About Us</li>
                <li className="hover:text-blue-600 cursor-pointer transition-colors">Contact</li>
                <li className="hover:text-blue-600 cursor-pointer transition-colors">Careers</li>
                <li className="hover:text-blue-600 cursor-pointer transition-colors">Blog</li>
              </ul>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}
