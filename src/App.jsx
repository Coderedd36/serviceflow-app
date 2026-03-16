import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useParams, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot, query, doc, updateDoc, where, orderBy, limit, deleteDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { 
  Wrench, Zap, Sparkles, Hammer, Search, Star, ShieldCheck, Clock, CheckCircle2, X, 
  ChevronRight, Calendar, MapPin, User, ArrowRight, MessageSquare, Bell, LayoutDashboard, 
  LogOut, Filter, ChevronDown, Send, UserCircle2, Briefcase, Plus, Image as ImageIcon,
  ThumbsUp, Menu, MoreVertical, Settings, Home, HardHat, DollarSign, Globe
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
  console.warn("Firebase configuration is missing. Using local state simulation.");
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
  ],
  electrical: [
    { id: 'e1', name: 'Install Light Fixture', price: 130, estimatedTime: '1-2 hours' },
    { id: 'e2', name: 'Replace Outlet/Switch', price: 95, estimatedTime: '1 hour' },
  ],
  cleaning: [
    { id: 'c1', name: 'Standard Home Cleaning', price: 140, estimatedTime: '2-3 hours' },
    { id: 'c2', name: 'Deep Cleaning', price: 220, estimatedTime: '4-5 hours' },
  ],
  handyman: [
    { id: 'h1', name: 'TV Mounting', price: 110, estimatedTime: '1-2 hours' },
    { id: 'h2', name: 'Furniture Assembly', price: 90, estimatedTime: '1-2 hours' },
  ]
};

const MOCK_PRO = {
  id: 'pro123',
  name: 'John Miller',
  rating: 4.9,
  reviews: 128,
  image: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=400&h=400&fit=crop',
  services: ['Plumbing', 'Handyman']
};

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
          <Link to="/" className="text-gray-600 hover:text-blue-600 font-bold transition-colors">Find Pros</Link>
          <Link to="/dashboard" className="text-gray-600 hover:text-blue-600 font-bold transition-colors flex items-center gap-2">
            Dashboard
            <span className="bg-blue-600 w-2 h-2 rounded-full"></span>
          </Link>
          <button 
            onClick={() => setRole(role === 'customer' ? 'pro' : 'customer')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full font-bold transition-all border-2 ${
              role === 'customer' 
                ? 'bg-blue-50 text-blue-600 border-blue-100' 
                : 'bg-orange-50 text-orange-600 border-orange-100'
            }`}
          >
            {role === 'customer' ? <Briefcase className="w-4 h-4" /> : <UserCircle2 className="w-4 h-4" />}
            {role === 'customer' ? 'Pro Mode' : 'Client Mode'}
          </button>
        </div>

        <div className="flex items-center space-x-4">
          <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 font-bold border-2 border-white shadow-sm overflow-hidden">
            <img src={role === 'customer' ? 'https://i.pravatar.cc/100?u=customer' : MOCK_PRO.image} alt="" />
          </div>
        </div>
      </div>
    </nav>
  );
};

// --- VIEWS ---

const Dashboard = ({ role, bookings, setBookings }) => {
  const [proTab, setProTab] = useState('marketplace'); // 'marketplace' or 'my-jobs'
  const navigate = useNavigate();

  // Filter logic
  const availableJobs = bookings.filter(b => b.status === 'pending' && !b.proId);
  const myProJobs = bookings.filter(b => b.proId === MOCK_PRO.id);
  const myCustomerBookings = bookings; // In this demo, customer sees everything they posted

  const stats = useMemo(() => {
    if (role === 'customer') {
      return [
        { label: 'Active Jobs', value: bookings.filter(b => b.status !== 'completed').length, icon: Clock, color: 'text-blue-600' },
        { label: 'Total Postings', value: bookings.length, icon: CheckCircle2, color: 'text-green-600' },
      ];
    } else {
      return [
        { label: 'Available Now', value: availableJobs.length, icon: Globe, color: 'text-orange-600' },
        { label: 'My Active Jobs', value: myProJobs.filter(b => b.status !== 'completed').length, icon: Briefcase, color: 'text-blue-600' },
        { label: 'My Earnings', value: `$${myProJobs.filter(b => b.status === 'completed').reduce((sum, b) => sum + b.price, 0)}`, icon: DollarSign, color: 'text-green-600' }
      ];
    }
  }, [role, bookings, availableJobs, myProJobs]);

  const updateStatus = async (bookingId, newStatus) => {
    if (db) {
      await updateDoc(doc(db, 'bookings', bookingId), { status: newStatus });
    } else {
      setBookings(bookings.map(b => b.id === bookingId ? { ...b, status: newStatus } : b));
    }
  };

  const claimJob = async (bookingId) => {
    if (db) {
      await updateDoc(doc(db, 'bookings', bookingId), { 
        status: 'accepted',
        proId: MOCK_PRO.id,
        proName: MOCK_PRO.name,
        proImage: MOCK_PRO.image
      });
    } else {
      setBookings(bookings.map(b => b.id === bookingId ? { ...b, status: 'accepted', proId: MOCK_PRO.id, proName: MOCK_PRO.name } : b));
    }
    setProTab('my-jobs');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-12">
        <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">
          {role === 'customer' ? 'My Project Center' : 'Professional Workspace'}
        </h1>
        <p className="text-gray-500 font-bold text-lg">
          {role === 'customer' ? 'Manage your home projects and assigned pros.' : 'Find high-paying jobs in your area and manage your schedule.'}
        </p>
      </div>

      {/* Role-Based Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border-2 border-gray-50 shadow-sm flex items-center gap-6">
            <div className={`w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center`}>
              <stat.icon className={`w-7 h-7 ${stat.color}`} />
            </div>
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <h3 className="text-2xl font-black text-gray-900">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Pro Marketplace / My Jobs Tabs */}
      {role === 'pro' && (
        <div className="flex gap-4 mb-8 bg-gray-100 p-1.5 rounded-2xl w-fit">
          <button 
            onClick={() => setProTab('marketplace')}
            className={`px-8 py-3 rounded-xl font-black transition-all ${proTab === 'marketplace' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Marketplace ({availableJobs.length})
          </button>
          <button 
            onClick={() => setProTab('my-jobs')}
            className={`px-8 py-3 rounded-xl font-black transition-all ${proTab === 'my-jobs' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            My Jobs ({myProJobs.length})
          </button>
        </div>
      )}

      {/* Dynamic Job List */}
      <div className="bg-white rounded-[2.5rem] border-2 border-gray-50 shadow-xl overflow-hidden">
        <div className="divide-y-2 divide-gray-50">
          {role === 'pro' && proTab === 'marketplace' && availableJobs.map(job => (
            <div key={job.id} className="p-8 hover:bg-gray-50/50 transition-all group">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex-grow">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-600 text-[10px] font-black uppercase tracking-widest border border-orange-200">New Lead</span>
                    <span className="text-xs font-bold text-gray-400">Posted {new Date(job.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mb-2">{job.job}</h3>
                  <div className="flex flex-wrap gap-6 text-sm font-bold text-gray-500">
                    <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-blue-500" /> {job.address}</div>
                    <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-orange-500" /> {job.date} • {job.time}</div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-3xl font-black text-gray-900">${job.price}</div>
                    <div className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-1 rounded-lg">Est. Profit</div>
                  </div>
                  <button 
                    onClick={() => claimJob(job.id)}
                    className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
                  >
                    Claim Job
                  </button>
                </div>
              </div>
            </div>
          ))}

          {role === 'pro' && proTab === 'my-jobs' && myProJobs.map(job => (
            <div key={job.id} className="p-8 hover:bg-gray-50/50 transition-all">
               <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex-grow">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(job.status)}`}>
                      {job.status}
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mb-2">{job.job}</h3>
                  <div className="flex flex-wrap gap-6 text-sm font-bold text-gray-500">
                    <div className="flex items-center gap-2"><User className="w-4 h-4" /> Client: {job.name}</div>
                    <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {job.address}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Link to={`/booking/${job.id}`} className="p-4 rounded-2xl bg-gray-50 text-gray-900 border-2 border-gray-100 hover:border-blue-500 transition-all shadow-sm">
                    <MessageSquare className="w-6 h-6" />
                  </Link>
                  {job.status === 'accepted' && (
                    <button onClick={() => updateStatus(job.id, 'in-progress')} className="bg-purple-600 text-white px-8 py-4 rounded-2xl font-black hover:bg-purple-700 transition-all shadow-lg shadow-purple-100">Start Project</button>
                  )}
                  {job.status === 'in-progress' && (
                    <button onClick={() => updateStatus(job.id, 'completed')} className="bg-green-600 text-white px-8 py-4 rounded-2xl font-black hover:bg-green-700 transition-all shadow-lg shadow-green-100">Mark Completed</button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {role === 'customer' && myCustomerBookings.map(job => (
            <div key={job.id} className="p-8 hover:bg-gray-50/50 transition-all">
               <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex-grow">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(job.status)}`}>
                      {job.status}
                    </span>
                    {!job.proId && <span className="text-xs font-bold text-blue-600 animate-pulse flex items-center gap-1"><Clock className="w-3 h-3" /> Finding a professional...</span>}
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mb-2">{job.job}</h3>
                  <div className="flex flex-wrap gap-6 text-sm font-bold text-gray-500">
                    {job.proId ? (
                      <div className="flex items-center gap-2"><Briefcase className="w-4 h-4 text-blue-500" /> Assigned: {job.proName}</div>
                    ) : (
                      <div className="flex items-center gap-2"><Globe className="w-4 h-4 text-orange-500" /> Live on Marketplace</div>
                    )}
                    <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-purple-500" /> {job.date}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Link to={`/booking/${job.id}`} className="bg-white border-2 border-gray-100 px-6 py-4 rounded-2xl font-black text-gray-900 hover:border-blue-600 hover:text-blue-600 transition-all shadow-sm flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" /> Manage
                  </Link>
                </div>
              </div>
            </div>
          ))}

          {((role === 'pro' && proTab === 'marketplace' && availableJobs.length === 0) ||
            (role === 'pro' && proTab === 'my-jobs' && myProJobs.length === 0) ||
            (role === 'customer' && myCustomerBookings.length === 0)) && (
            <div className="p-20 text-center">
              <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-xl font-black text-gray-900">Nothing found here yet</h3>
              <p className="text-gray-500 font-bold mt-2">Check back later or try posting a new job!</p>
            </div>
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
  const [messages, setMessages] = useState([
    { id: '1', sender: 'system', text: 'Booking Created! Our team of professionals has been notified.', time: 'System' }
  ]);
  const [newMsg, setNewMsg] = useState('');
  
  if (!booking) return <div className="p-20 text-center">Booking not found</div>;

  const handleSend = () => {
    if (!newMsg.trim()) return;
    setMessages([...messages, { id: Date.now().toString(), sender: role, text: newMsg, time: 'Just now' }]);
    setNewMsg('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
       <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 font-bold mb-8 hover:text-gray-900 group">
        <ArrowRight className="w-5 h-5 rotate-180 group-hover:-translate-x-1 transition-transform" /> Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-10 rounded-[3rem] border-2 border-gray-50 shadow-xl relative overflow-hidden">
             <div className="flex flex-wrap items-center gap-4 mb-6">
                <span className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest border-2 ${getStatusColor(booking.status)}`}>
                  {booking.status}
                </span>
                <span className="text-sm font-bold text-gray-400 tracking-tight">Booking Ref: #{booking.id.slice(-6).toUpperCase()}</span>
             </div>
             <h1 className="text-5xl font-black text-gray-900 tracking-tight mb-8 leading-[1.1]">{booking.job}</h1>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-10 pt-10 border-t border-gray-50">
               <div className="space-y-6">
                 <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600"><Calendar className="w-6 h-6" /></div>
                   <div>
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Scheduled For</p>
                     <p className="text-lg font-black text-gray-900">{booking.date} at {booking.time}</p>
                   </div>
                 </div>
                 <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600"><MapPin className="w-6 h-6" /></div>
                   <div>
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Service Address</p>
                     <p className="text-lg font-black text-gray-900">{booking.address}</p>
                   </div>
                 </div>
               </div>
               <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center text-green-600"><DollarSign className="w-6 h-6" /></div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Project Total</p>
                      <p className="text-3xl font-black text-gray-900">${booking.price}</p>
                    </div>
                  </div>
                  {booking.proId && (
                    <div className="flex items-center gap-4">
                      <img src={booking.proImage || MOCK_PRO.image} className="w-12 h-12 rounded-2xl object-cover" alt="" />
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Assigned Pro</p>
                        <p className="text-lg font-black text-gray-900">{booking.proName}</p>
                      </div>
                    </div>
                  )}
               </div>
             </div>

             {booking.notes && (
               <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                 <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Project Notes</p>
                 <p className="text-gray-700 font-bold leading-relaxed">{booking.notes}</p>
               </div>
             )}
          </div>

          {/* Chat Window */}
          <div className="bg-white rounded-[3rem] border-2 border-gray-50 shadow-xl overflow-hidden flex flex-col h-[600px]">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
              <h3 className="text-xl font-black text-gray-900 flex items-center gap-3">
                <MessageSquare className="w-6 h-6 text-blue-600" /> Project Chat
              </h3>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span className="text-xs font-bold text-gray-400 uppercase">Live</span>
              </div>
            </div>
            
            <div className="flex-grow p-8 overflow-y-auto space-y-6 bg-gray-50/20">
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.sender === 'system' ? 'justify-center' : m.sender === role ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] px-6 py-4 rounded-3xl shadow-sm ${
                    m.sender === 'system' ? 'bg-gray-100 text-gray-500 text-[10px] font-black uppercase tracking-widest' :
                    m.sender === role ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-gray-100 text-gray-900 rounded-tl-none font-bold'
                  }`}>
                    <p className={m.sender === 'system' ? '' : 'text-sm'}>{m.text}</p>
                    {m.sender !== 'system' && <span className="text-[9px] font-black uppercase opacity-60 mt-2 block">{m.time}</span>}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-gray-50 flex gap-4">
               <input 
                type="text" 
                value={newMsg}
                onChange={e => setNewMsg(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleSend()}
                placeholder="Message your project partner..." 
                className="flex-grow bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold focus:ring-4 focus:ring-blue-50 transition-all"
               />
               <button onClick={handleSend} className="bg-blue-600 text-white p-4 rounded-2xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95">
                 <Send className="w-6 h-6" />
               </button>
            </div>
          </div>
        </div>

        {/* Sidebar Status / Actions */}
        <div className="space-y-8">
           <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
             <div className="relative z-10">
               <h4 className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-4">Project Action</h4>
               <p className="text-2xl font-black mb-8 leading-tight">Need to adjust your project details?</p>
               <button className="w-full py-4 bg-white text-blue-600 rounded-2xl font-black hover:bg-blue-50 transition-all flex items-center justify-center gap-2 mb-4">
                 Modify Request <ArrowRight className="w-5 h-5" />
               </button>
               <button className="w-full py-4 bg-blue-500/30 text-white border border-blue-400/50 rounded-2xl font-black hover:bg-blue-500/50 transition-all">
                 Cancel Booking
               </button>
             </div>
             <ShieldCheck className="absolute -bottom-4 -right-4 w-32 h-32 opacity-10" />
           </div>

           <div className="bg-white p-8 rounded-[3rem] border-2 border-gray-50 shadow-lg text-center">
             <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500">
               <ThumbsUp className="w-10 h-10" />
             </div>
             <h3 className="text-xl font-black text-gray-900 mb-2">ServiceFlow Protection</h3>
             <p className="text-sm font-bold text-gray-500 leading-relaxed">Your payment is held in escrow and only released once you confirm the job is done perfectly.</p>
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

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handleBooking = async () => {
    const newBooking = {
      job: selectedJob.name,
      price: selectedJob.price,
      ...bookingData,
      status: 'pending',
      createdAt: new Date().toISOString(),
      proId: null
    };

    if (db) {
      await addDoc(collection(db, 'bookings'), newBooking);
    } else {
      setBookings([{ id: Date.now().toString(), ...newBooking }, ...bookings]);
    }
    setBookingStep(3);
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 flex flex-col font-sans selection:bg-blue-100">
        <Navbar role={role} setRole={setRole} />
        
        <Routes>
          <Route path="/" element={
            <div className="pb-20">
              {/* Modern Hero */}
              <div className="bg-gradient-to-b from-white to-blue-50 py-24 md:py-32 text-center relative overflow-hidden">
                <div className="max-w-4xl mx-auto px-4 relative z-10">
                  <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="inline-block px-4 py-2 bg-blue-100 text-blue-600 font-black text-[10px] uppercase tracking-[0.2em] rounded-full mb-8">Home Services Marketplace</motion.span>
                  <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-6xl md:text-8xl font-black text-gray-900 tracking-tighter mb-8 leading-[0.95]">Find it. Price it. <span className="text-blue-600">Claim it.</span></motion.h1>
                  <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-xl font-bold text-gray-500 mb-12 max-w-2xl mx-auto">Skip the haggling. Upfront prices for customers. Direct, high-paying leads for professionals. No middlemen.</motion.p>
                  
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} className="max-w-2xl mx-auto relative group">
                    <Search className="absolute left-6 top-6 w-7 h-7 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                    <input className="w-full pl-16 pr-8 py-6 rounded-3xl border-4 border-white shadow-2xl shadow-blue-200/50 text-xl font-bold focus:outline-none transition-all placeholder:text-gray-400" placeholder="Describe the job you need help with..." />
                    <button className="absolute right-3 top-3 bg-blue-600 text-white px-8 py-3.5 rounded-2xl font-black text-lg shadow-lg hover:bg-blue-700 active:scale-95 transition-all">Search</button>
                  </motion.div>
                </div>
                <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
                  <div className="absolute top-20 left-10 w-64 h-64 border-[40px] border-blue-600 rounded-full"></div>
                  <div className="absolute bottom-20 right-10 w-80 h-80 border-[40px] border-indigo-600 rounded-full"></div>
                </div>
              </div>

              {/* Grid */}
              <div className="max-w-7xl mx-auto px-4 -mt-12 relative z-20">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                  {SERVICES.map((s, i) => (
                    <motion.div 
                      key={s.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * i }}
                      onClick={() => setSelectedService(s)}
                      className="group bg-white p-8 rounded-[2.5rem] border-2 border-gray-50 shadow-xl hover:border-blue-500 hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer"
                    >
                      <div className={`w-16 h-16 rounded-2xl ${s.bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                        <s.icon className={`w-8 h-8 ${s.color}`} />
                      </div>
                      <h3 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">{s.name}</h3>
                      <p className="text-gray-500 font-bold leading-relaxed mb-6">{s.description}</p>
                      <div className="text-blue-600 font-black flex items-center gap-2 text-sm uppercase tracking-widest">Pricing <ArrowRight className="w-4 h-4" /></div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          } />
          
          <Route path="/dashboard" element={<Dashboard role={role} bookings={bookings} setBookings={setBookings} />} />
          <Route path="/booking/:id" element={<BookingDetails role={role} bookings={bookings} />} />
        </Routes>

        {/* Dynamic Modals */}
        <AnimatePresence>
          {selectedService && bookingStep === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-gray-900/60 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setSelectedService(null)}>
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-[3rem] w-full max-w-4xl shadow-2xl p-10 overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-6">
                    <div className={`w-16 h-16 rounded-2xl ${selectedService.bg} flex items-center justify-center`}><selectedService.icon className={`w-9 h-9 ${selectedService.color}`} /></div>
                    <h2 className="text-4xl font-black tracking-tight">{selectedService.name} Pricing</h2>
                  </div>
                  <button onClick={() => setSelectedService(null)} className="p-3 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"><X className="w-7 h-7" /></button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {JOBS[selectedService.id].map(job => (
                    <div key={job.id} onClick={() => { setSelectedJob(job); setBookingStep(1); }} className="p-8 rounded-3xl border-2 border-gray-100 hover:border-blue-600 hover:shadow-xl transition-all cursor-pointer flex items-center justify-between group">
                      <div>
                        <h4 className="text-2xl font-black text-gray-900 mb-1">{job.name}</h4>
                        <div className="flex items-center gap-2 text-sm font-bold text-gray-400"><Clock className="w-4 h-4" /> {job.estimatedTime}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-black text-gray-900">${job.price}</div>
                        <div className="text-[10px] font-black uppercase text-green-600 tracking-widest bg-green-50 px-2 py-1 rounded-lg">Verified Price</div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}

          {bookingStep > 0 && bookingStep < 3 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[110] bg-blue-600/10 backdrop-blur-xl flex items-center justify-center p-4">
              <motion.div initial={{ scale: 0.9, y: 40 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl p-10 relative overflow-hidden">
                <button onClick={() => setBookingStep(0)} className="absolute top-6 right-6 p-2 text-gray-300 hover:text-gray-900"><X className="w-6 h-6" /></button>
                {bookingStep === 1 && (
                  <div className="space-y-6">
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Step 1 of 2 • Scheduling</span>
                    <h3 className="text-3xl font-black leading-tight">When should we send your pro?</h3>
                    <input type="date" value={bookingData.date} onChange={e => setBookingData({...bookingData, date: e.target.value})} className="w-full p-6 bg-gray-50 border-none rounded-2xl font-bold focus:ring-4 focus:ring-blue-100" />
                    <select value={bookingData.time} onChange={e => setBookingData({...bookingData, time: e.target.value})} className="w-full p-6 bg-gray-50 border-none rounded-2xl font-bold appearance-none">
                      <option value="">Choose Time Preference</option>
                      <option value="morning">Morning (8am - 12pm)</option>
                      <option value="afternoon">Afternoon (12pm - 4pm)</option>
                      <option value="evening">Evening (4pm - 8pm)</option>
                    </select>
                    <button disabled={!bookingData.date || !bookingData.time} onClick={() => setBookingStep(2)} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-xl shadow-xl shadow-blue-200 disabled:opacity-50">Continue</button>
                  </div>
                )}
                {bookingStep === 2 && (
                  <div className="space-y-6">
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Step 2 of 2 • Location</span>
                    <h3 className="text-3xl font-black leading-tight">Confirm job details.</h3>
                    <input type="text" placeholder="Your Name" value={bookingData.name} onChange={e => setBookingData({...bookingData, name: e.target.value})} className="w-full p-6 bg-gray-50 border-none rounded-2xl font-bold" />
                    <input type="text" placeholder="Service Address" value={bookingData.address} onChange={e => setBookingData({...bookingData, address: e.target.value})} className="w-full p-6 bg-gray-50 border-none rounded-2xl font-bold" />
                    <textarea placeholder="Job instructions..." value={bookingData.notes} onChange={e => setBookingData({...bookingData, notes: e.target.value})} className="w-full p-6 bg-gray-50 border-none rounded-2xl font-bold resize-none" rows="3" />
                    <button onClick={handleBooking} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-xl shadow-xl shadow-blue-200">Post to Marketplace</button>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}

          {bookingStep === 3 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[120] bg-blue-600 flex items-center justify-center p-4 text-center">
              <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="max-w-md text-white">
                <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-10"><CheckCircle2 className="w-16 h-16" /></div>
                <h2 className="text-5xl font-black mb-6">Job is Live!</h2>
                <p className="text-xl font-bold text-blue-100 mb-12">We've posted your project to our marketplace. A professional will claim it shortly.</p>
                <button onClick={() => { setBookingStep(0); setSelectedService(null); navigate('/dashboard'); }} className="bg-white text-blue-600 px-12 py-5 rounded-2xl font-black text-xl shadow-2xl hover:scale-105 transition-all">Go to Dashboard</button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Router>
  );
}
