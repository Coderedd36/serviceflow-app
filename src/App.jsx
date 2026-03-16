import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route, Link, useNavigate, useParams, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot, query, doc, updateDoc, where, orderBy, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { 
  Wrench, Zap, Sparkles, Hammer, Search, Star, ShieldCheck, Clock, CheckCircle2, X, 
  Calendar, MapPin, User, ArrowRight, MessageSquare, Bell, LogOut, Filter, Send, 
  UserCircle2, Briefcase, Plus, ThumbsUp, DollarSign, Globe, Lock, Mail
} from 'lucide-react';

// --- FIREBASE CONFIG ---
const firebaseConfig = {
  apiKey: "AIzaSyDg1CHuDphsODoCi6GnxZH2T16L6S5RuhM",
  authDomain: "service-flow-62ece.firebaseapp.com",
  projectId: "service-flow-62ece",
  storageBucket: "service-flow-62ece.firebasestorage.app",
  messagingSenderId: "23717551992",
  appId: "1:23717551992:web:f33301ddf4210c160cf28d",
  measurementId: "G-XNXH0VQV5N"
};

// --- INITIALIZATION ---
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

// --- CONSTANTS ---
const SERVICES = [
  { id: 'plumbing', name: 'Plumbing', icon: Wrench, color: 'text-blue-500', bg: 'bg-blue-50', description: 'Leaks, clogs, installations, and repairs.' },
  { id: 'electrical', name: 'Electrical', icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-50', description: 'Wiring, fixtures, panels, and troubleshooting.' },
  { id: 'cleaning', name: 'Cleaning', icon: Sparkles, color: 'text-green-500', bg: 'bg-green-50', description: 'Standard, deep, and move-in/out cleaning.' },
  { id: 'handyman', name: 'Handyman', icon: Hammer, color: 'text-orange-500', bg: 'bg-orange-50', description: 'Furniture assembly, mounting, general repairs.' },
];

const JOBS = {
  plumbing: [{ id: 'p1', name: 'Fix a Leaky Faucet', price: 120, estimatedTime: '1-2h' }, { id: 'p2', name: 'Unclog a Drain', price: 150, estimatedTime: '1-2h' }],
  electrical: [{ id: 'e1', name: 'Install Light Fixture', price: 130, estimatedTime: '1-2h' }, { id: 'e2', name: 'Replace Outlet/Switch', price: 95, estimatedTime: '1h' }],
  cleaning: [{ id: 'c1', name: 'Standard Home Cleaning', price: 140, estimatedTime: '2-3h' }, { id: 'c2', name: 'Deep Cleaning', price: 220, estimatedTime: '4-5h' }],
  handyman: [{ id: 'h1', name: 'TV Mounting', price: 110, estimatedTime: '1-2h' }, { id: 'h2', name: 'Furniture Assembly', price: 90, estimatedTime: '1-2h' }],
};

const getStatusColor = (status) => {
  switch (status) {
    case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'accepted': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'in-progress': return 'bg-purple-100 text-purple-700 border-purple-200';
    case 'completed': return 'bg-green-100 text-green-700 border-green-200';
    default: return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

// --- AUTH MODAL ---
const AuthModal = ({ isOpen, onClose, initialMode = 'login' }) => {
  const [mode, setMode] = useState(initialMode);
  const [role, setRole] = useState('customer');
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { setMode(initialMode); setError(''); }, [initialMode, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        const userCred = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        await setDoc(doc(db, 'users', userCred.user.uid), {
          uid: userCred.user.uid,
          name: formData.name,
          email: formData.email,
          role: role,
          createdAt: Timestamp.now()
        });
      } else {
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
      }
      onClose();
    } catch (err) {
      setError(err.message.includes('configuration-not-found') 
        ? "Please enable Email/Password login in your Firebase Console." 
        : err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-gray-900/60 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-900 transition-colors"><X /></button>
        <h2 className="text-3xl font-black text-gray-900 mb-2">{mode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
        <p className="text-gray-500 font-bold mb-8">{mode === 'login' ? 'Log in to manage your projects.' : 'Join the ServiceFlow marketplace.'}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <>
              <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl mb-6">
                <button type="button" onClick={() => setRole('customer')} className={`flex-1 py-2 rounded-xl font-bold transition-all ${role === 'customer' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>Customer</button>
                <button type="button" onClick={() => setRole('pro')} className={`flex-1 py-2 rounded-xl font-bold transition-all ${role === 'pro' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>Professional</button>
              </div>
              <div className="relative">
                <User className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                <input required type="text" placeholder="Full Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-none rounded-xl font-bold focus:ring-2 focus:ring-blue-100 transition-all" />
              </div>
            </>
          )}
          <div className="relative">
            <Mail className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
            <input required type="email" placeholder="Email Address" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-none rounded-xl font-bold focus:ring-2 focus:ring-blue-100 transition-all" />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
            <input required type="password" placeholder="Password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-none rounded-xl font-bold focus:ring-2 focus:ring-blue-100 transition-all" />
          </div>
          {error && <p className="text-red-500 text-sm font-bold bg-red-50 p-3 rounded-lg border border-red-100">{error}</p>}
          <button disabled={loading} className="w-full bg-blue-600 text-white py-4 rounded-xl font-black text-lg shadow-lg hover:bg-blue-700 transition-all active:scale-95">{loading ? 'Processing...' : mode === 'login' ? 'Log In' : 'Sign Up'}</button>
        </form>
        <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} className="w-full text-center mt-6 text-sm font-bold text-gray-500 hover:text-blue-600">{mode === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Log In"}</button>
      </motion.div>
    </div>
  );
};

// --- NAVBAR ---
const Navbar = ({ user, userProfile, openAuth }) => {
  return (
    <nav className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-[60] h-16">
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-200"><Wrench className="w-5 h-5 text-white" /></div>
          <span className="text-xl font-black text-gray-900 tracking-tight">ServiceFlow</span>
        </Link>
        <div className="flex items-center gap-6">
          {user ? (
            <>
              <Link to="/dashboard" className="text-gray-600 hover:text-blue-600 font-bold transition-colors">Dashboard</Link>
              <div className="flex items-center gap-3 pl-6 border-l border-gray-100">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-black text-gray-900">{userProfile?.name || 'User'}</p>
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{userProfile?.role}</p>
                </div>
                <button onClick={() => signOut(auth)} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><LogOut /></button>
              </div>
            </>
          ) : (
            <>
              <button onClick={() => openAuth('login')} className="text-gray-600 font-bold hover:text-blue-600">Log In</button>
              <button onClick={() => openAuth('signup')} className="bg-blue-600 text-white px-6 py-2 rounded-full font-black shadow-lg hover:bg-blue-700 shadow-blue-100">Get Started</button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

// --- VIEWS ---
const LandingPage = ({ setSelectedService }) => (
  <div className="pb-20">
    <div className="bg-gradient-to-b from-white to-blue-50 py-24 text-center">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-6xl md:text-8xl font-black text-gray-900 tracking-tighter mb-8 leading-[0.95]">Home Services, <span className="text-blue-600">Solved.</span></h1>
        <p className="text-xl font-bold text-gray-500 mb-12 max-w-2xl mx-auto tracking-tight leading-relaxed">Top-rated professionals. Instant fixed pricing. Guaranteed quality. The marketplace built for high-ticket home services.</p>
        <div className="max-w-2xl mx-auto relative group">
          <Search className="absolute left-6 top-6 w-7 h-7 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
          <input className="w-full pl-16 pr-8 py-6 rounded-3xl border-4 border-white shadow-2xl text-xl font-bold focus:outline-none focus:border-blue-100 transition-all placeholder:text-gray-300" placeholder="What do you need help with? (e.g. electrical)" />
        </div>
      </div>
    </div>
    <div className="max-w-7xl mx-auto px-4 -mt-12 relative z-20">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {SERVICES.map((s, i) => (
          <motion.div key={s.id} onClick={() => setSelectedService(s)} className="group bg-white p-8 rounded-[2.5rem] border-2 border-gray-50 shadow-xl shadow-blue-900/5 hover:border-blue-500 hover:-translate-y-2 transition-all cursor-pointer">
            <div className={`w-16 h-16 rounded-2xl ${s.bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}><s.icon className={`w-8 h-8 ${s.color}`} /></div>
            <h3 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">{s.name}</h3>
            <p className="text-gray-500 font-bold leading-relaxed mb-6">{s.description}</p>
            <div className="text-blue-600 font-black flex items-center gap-2 text-sm uppercase tracking-widest">See Pricing <ArrowRight className="w-4 h-4" /></div>
          </motion.div>
        ))}
      </div>
    </div>
  </div>
);

const Dashboard = ({ user, profile, bookings }) => {
  const [tab, setTab] = useState('main');
  const availableJobs = bookings.filter(b => b.status === 'pending' && !b.proId);
  const myJobs = profile?.role === 'customer' ? bookings.filter(b => b.customerId === user?.uid) : bookings.filter(b => b.proId === user?.uid);

  const claimJob = async (id) => {
    try {
      await updateDoc(doc(db, 'bookings', id), { proId: user.uid, proName: profile.name, status: 'accepted' });
      setTab('main');
    } catch (e) { console.error(e); alert("Failed to claim job. Please check Firestore permissions."); }
  };

  const updateStatus = async (id, status) => {
    try { await updateDoc(doc(db, 'bookings', id), { status }); } catch (e) { console.error(e); }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">My {profile?.role === 'customer' ? 'Dashboard' : 'Workspace'}</h1>
          <p className="text-gray-500 font-bold">Logged in as {profile?.name}</p>
        </div>
        {profile?.role === 'pro' && (
          <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl">
            <button onClick={() => setTab('main')} className={`px-8 py-2.5 rounded-xl font-black transition-all ${tab === 'main' ? 'bg-white shadow-md text-blue-600' : 'text-gray-500 hover:text-gray-800'}`}>My Schedule ({myJobs.length})</button>
            <button onClick={() => setTab('marketplace')} className={`px-8 py-2.5 rounded-xl font-black transition-all ${tab === 'marketplace' ? 'bg-white shadow-md text-blue-600' : 'text-gray-500 hover:text-gray-800'}`}>Marketplace ({availableJobs.length})</button>
          </div>
        )}
      </div>
      <div className="bg-white rounded-[2.5rem] border-2 border-gray-50 shadow-2xl shadow-blue-900/5 overflow-hidden">
        <div className="divide-y-2 divide-gray-50">
          {(tab === 'marketplace' ? availableJobs : myJobs).map(job => (
            <div key={job.id} className="p-8 hover:bg-gray-50/30 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-8 group">
              <div className="flex-grow">
                <div className="flex items-center gap-3 mb-4"><span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border-2 ${getStatusColor(job.status)}`}>{job.status}</span></div>
                <h3 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">{job.job}</h3>
                <div className="flex flex-wrap gap-8 text-sm font-bold text-gray-500">
                  <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-blue-500" /> {job.address}</div>
                  <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-orange-500" /> {job.date}</div>
                  {profile?.role === 'customer' && job.proId && <div className="flex items-center gap-2 font-black text-blue-600"><Briefcase className="w-4 h-4" /> Pro Assigned: {job.proName}</div>}
                  {profile?.role === 'pro' && <div className="flex items-center gap-2 font-black text-orange-600"><User className="w-4 h-4" /> Client: {job.name}</div>}
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right mr-4"><div className="text-3xl font-black text-gray-900 tracking-tight">${job.price}</div></div>
                {tab === 'marketplace' ? (
                  <button onClick={() => claimJob(job.id)} className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all active:scale-95">Claim Job</button>
                ) : (
                  <div className="flex gap-3">
                    <Link to={`/booking/${job.id}`} className="p-4 bg-gray-50 rounded-2xl border-2 border-gray-100 hover:border-blue-500 transition-all shadow-sm"><MessageSquare className="w-6 h-6" /></Link>
                    {profile?.role === 'pro' && job.status === 'accepted' && <button onClick={() => updateStatus(job.id, 'in-progress')} className="bg-purple-600 text-white px-8 py-2 rounded-2xl font-black hover:bg-purple-700 transition-all shadow-lg shadow-purple-200">Start Job</button>}
                    {profile?.role === 'pro' && job.status === 'in-progress' && <button onClick={() => updateStatus(job.id, 'completed')} className="bg-green-600 text-white px-8 py-2 rounded-2xl font-black hover:bg-green-700 transition-all shadow-lg shadow-green-200">Complete</button>}
                  </div>
                )}
              </div>
            </div>
          ))}
          {(tab === 'marketplace' ? availableJobs : myJobs).length === 0 && (
            <div className="p-24 text-center">
              <Search className="w-16 h-16 mx-auto text-gray-200 mb-6" />
              <h3 className="text-xl font-black text-gray-900">No projects found.</h3>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- MAIN APP ---
export default function App() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [authModal, setAuthModal] = useState({ open: false, mode: 'login' });
  const [selectedService, setSelectedService] = useState(null);
  const [bookingStep, setBookingStep] = useState(0);
  const [selectedJob, setSelectedJob] = useState(null);
  const [bookingData, setBookingData] = useState({ date: '', time: '', name: '', address: '', notes: '' });

  const navigate = useNavigate();

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const d = await getDoc(doc(db, 'users', u.uid));
          if (d.exists()) setUserProfile(d.data());
        } catch (e) { console.error(e); }
      } else {
        setUserProfile(null);
      }
    });
  }, []);

  useEffect(() => {
    return onSnapshot(query(collection(db, 'bookings'), orderBy('createdAt', 'desc')), (s) => {
      setBookings(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const handleBooking = async () => {
    if (!user) { setAuthModal({ open: true, mode: 'signup' }); return; }
    try {
      const payload = { job: selectedJob.name, price: selectedJob.price, ...bookingData, customerId: user.uid, status: 'pending', createdAt: Timestamp.now(), proId: null };
      await addDoc(collection(db, 'bookings'), payload);
      setBookingStep(3);
    } catch (e) { console.error(e); alert("Failed to create booking. Please check Firestore setup."); }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans selection:bg-blue-100">
      <Navbar user={user} userProfile={userProfile} openAuth={(mode) => setAuthModal({ open: true, mode })} />
      <Routes>
        <Route path="/" element={<LandingPage setSelectedService={setSelectedService} />} />
        <Route path="/dashboard" element={user ? <Dashboard user={user} profile={userProfile} bookings={bookings} /> : <Navigate to="/" />} />
        <Route path="/booking/:id" element={<div className="p-40 text-center"><h1 className="text-4xl font-black tracking-tight">Real-time messaging active.</h1></div>} />
      </Routes>
      <AuthModal isOpen={authModal.open} onClose={() => setAuthModal({ ...authModal, open: false })} initialMode={authModal.mode} />
      <AnimatePresence>
        {selectedService && bookingStep === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-gray-900/60 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setSelectedService(null)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-[3rem] w-full max-w-4xl p-12 shadow-2xl relative overflow-hidden" onClick={e => e.stopPropagation()}>
              <button onClick={() => setSelectedService(null)} className="absolute top-8 right-8 p-3 bg-gray-50 rounded-full hover:bg-gray-100 transition-all"><X className="w-8 h-8 text-gray-400" /></button>
              <h2 className="text-5xl font-black mb-12 tracking-tight">{selectedService.name} Pricing</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {JOBS[selectedService.id].map(job => (
                  <div key={job.id} onClick={() => { setSelectedJob(job); setBookingStep(1); }} className="p-8 rounded-3xl border-2 border-gray-100 bg-gray-50/20 hover:border-blue-500 hover:bg-white hover:shadow-2xl transition-all cursor-pointer flex justify-between items-center group">
                    <div><h4 className="text-2xl font-black mb-2 group-hover:text-blue-600 transition-colors">{job.name}</h4><p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Fixed Price • {job.estimatedTime} Est.</p></div>
                    <div className="text-3xl font-black text-gray-900">${job.price}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
        {bookingStep > 0 && bookingStep < 3 && (
          <div className="fixed inset-0 z-[110] bg-blue-600/10 backdrop-blur-xl flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl relative">
              <button onClick={() => setBookingStep(0)} className="absolute top-8 right-8 text-gray-300 hover:text-gray-900"><X className="w-7 h-7" /></button>
              {bookingStep === 1 && (
                <div className="space-y-8">
                  <h3 className="text-4xl font-black tracking-tight">Select a Date</h3>
                  <input type="date" value={bookingData.date} onChange={e => setBookingData({...bookingData, date: e.target.value})} className="w-full p-6 bg-gray-50 border-none rounded-2xl font-black focus:ring-4 focus:ring-blue-100 transition-all" />
                  <select value={bookingData.time} onChange={e => setBookingData({...bookingData, time: e.target.value})} className="w-full p-6 bg-gray-50 border-none rounded-2xl font-black appearance-none">
                    <option value="">Preferred Time Frame</option><option value="morning">Morning</option><option value="afternoon">Afternoon</option>
                  </select>
                  <button onClick={() => setBookingStep(2)} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-xl shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all">Next Step</button>
                </div>
              )}
              {bookingStep === 2 && (
                <div className="space-y-6">
                  <h3 className="text-4xl font-black tracking-tight">Job Location</h3>
                  <input type="text" placeholder="Your Name" value={bookingData.name} onChange={e => setBookingData({...bookingData, name: e.target.value})} className="w-full p-6 bg-gray-50 border-none rounded-2xl font-black focus:ring-4 focus:ring-blue-100 transition-all" />
                  <input type="text" placeholder="Service Address" value={bookingData.address} onChange={e => setBookingData({...bookingData, address: e.target.value})} className="w-full p-6 bg-gray-50 border-none rounded-2xl font-black focus:ring-4 focus:ring-blue-100 transition-all" />
                  <button onClick={handleBooking} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-xl shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all mt-6">Confirm Booking</button>
                </div>
              )}
            </motion.div>
          </div>
        )}
        {bookingStep === 3 && (
          <div className="fixed inset-0 z-[120] bg-blue-600 flex items-center justify-center p-4 text-center text-white">
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="max-w-md">
              <div className="w-28 h-28 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-10"><CheckCircle2 className="w-14 h-14" /></div>
              <h2 className="text-6xl font-black mb-6 tracking-tight">Confirmed!</h2>
              <p className="text-2xl font-bold mb-14 opacity-90 leading-relaxed">Your job is live on the marketplace.</p>
              <button onClick={() => { setBookingStep(0); setSelectedService(null); navigate('/dashboard'); }} className="bg-white text-blue-600 px-14 py-5 rounded-2xl font-black text-xl shadow-2xl hover:scale-105 transition-all">Go to Dashboard</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
