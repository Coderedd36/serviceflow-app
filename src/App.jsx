import React, { useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { Wrench, Zap, Sparkles, Hammer, Search, Star, ShieldCheck, Clock, CheckCircle2, X, ChevronRight, Calendar, MapPin, User, ArrowRight } from 'lucide-react';

// Initialize Firebase (Safely handle missing config)
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
  console.warn("Firebase configuration is missing or invalid. Bookings will only be logged to console.");
}

// --- MOCK DATA ---
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

// --- COMPONENTS ---

const Navbar = () => (
  <nav className="border-b bg-white sticky top-0 z-50">
    <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <div className="bg-blue-600 p-2 rounded-lg">
          <Wrench className="w-6 h-6 text-white" />
        </div>
        <span className="text-xl font-bold text-gray-900 tracking-tight">ServiceFlow</span>
      </div>
      <div className="hidden md:flex items-center space-x-6">
        <a href="#" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">Services</a>
        <a href="#" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">How it Works</a>
        <a href="#" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">For Pros</a>
      </div>
      <div className="flex items-center space-x-4">
        <button className="text-gray-600 hover:text-blue-600 font-medium hidden sm:block transition-colors">Log In</button>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm">
          Sign Up
        </button>
      </div>
    </div>
  </nav>
);

const Hero = () => (
  <div className="bg-blue-50 py-16 md:py-24 border-b border-blue-100">
    <div className="max-w-6xl mx-auto px-4 text-center">
      <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6 tracking-tight">
        Better Home Services, <span className="text-blue-600">Instantly.</span>
      </h1>
      <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
        Skip the back-and-forth. See upfront transparent pricing and book top-rated local professionals in seconds.
      </p>
      
      <div className="max-w-2xl mx-auto relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-6 w-6 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
        </div>
        <input 
          type="text" 
          className="block w-full pl-12 pr-4 py-4 rounded-xl border border-gray-200 text-lg shadow-sm focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:outline-none transition-all" 
          placeholder="What do you need help with? (e.g., 'leaky faucet')"
        />
        <button className="absolute inset-y-2 right-2 bg-blue-600 hover:bg-blue-700 text-white px-6 rounded-lg font-medium transition-colors">
          Search
        </button>
      </div>
      
      <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm font-medium text-gray-600">
        <div className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-green-500" /> Vetted Professionals</div>
        <div className="flex items-center gap-2"><Clock className="w-5 h-5 text-blue-500" /> Instant Booking</div>
        <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-purple-500" /> Transparent Pricing</div>
      </div>
    </div>
  </div>
);

const Footer = () => (
  <footer className="bg-gray-50 border-t py-12 mt-auto">
    <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-gray-500 text-sm">
      <div className="flex items-center space-x-2 mb-4 md:mb-0">
        <Wrench className="w-5 h-5" />
        <span className="font-bold text-gray-700">ServiceFlow</span>
      </div>
      <div className="flex space-x-6">
        <a href="#" className="hover:text-gray-900">About</a>
        <a href="#" className="hover:text-gray-900">Terms</a>
        <a href="#" className="hover:text-gray-900">Privacy</a>
        <a href="#" className="hover:text-gray-900">Contact</a>
      </div>
      <div className="mt-4 md:mt-0">
        &copy; {new Date().getFullYear()} ServiceFlow. All rights reserved.
      </div>
    </div>
  </footer>
);

export default function App() {
  const [selectedService, setSelectedService] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [bookingStep, setBookingStep] = useState(0); // 0: closed, 1: date, 2: details, 3: success
  const [bookingData, setBookingData] = useState({ date: '', time: '', name: '', address: '', notes: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleJobSelect = (job) => {
    setSelectedJob(job);
    setBookingStep(1);
  };

  const closeBooking = () => {
    setBookingStep(0);
    setSelectedJob(null);
    setBookingData({ date: '', time: '', name: '', address: '', notes: '' });
  };

  const handleInputChange = (e) => {
    setBookingData({ ...bookingData, [e.target.name]: e.target.value });
  };

  const submitBooking = async () => {
    setIsSubmitting(true);
    
    const finalBooking = {
      job: selectedJob.name,
      price: selectedJob.price,
      serviceCategory: selectedService.name,
      ...bookingData,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    try {
      if (db) {
        await addDoc(collection(db, 'bookings'), finalBooking);
      } else {
        console.log("Mock Booking Saved:", finalBooking);
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 800));
      }
      setBookingStep(3); // Success step
    } catch (error) {
      console.error("Error saving booking:", error);
      alert("There was an error saving your booking. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-gray-900">
      <Navbar />
      <Hero />

      <main className="flex-grow max-w-6xl mx-auto px-4 py-16 w-full">
        {/* Service Categories Grid */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold mb-8">What do you need help with?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {SERVICES.map((service) => {
              const Icon = service.icon;
              const isSelected = selectedService?.id === service.id;
              return (
                <div 
                  key={service.id}
                  onClick={() => setSelectedService(isSelected ? null : service)}
                  className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${
                    isSelected 
                      ? 'border-blue-600 bg-blue-50/50 shadow-md ring-4 ring-blue-50' 
                      : 'border-gray-100 bg-white hover:border-blue-200 hover:shadow-lg hover:-translate-y-1'
                  }`}
                >
                  <div className={`w-14 h-14 rounded-xl ${service.bg} flex items-center justify-center mb-4`}>
                    <Icon className={`w-7 h-7 ${service.color}`} />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{service.name}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{service.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Service Details (Instant Pricing) */}
        {selectedService && (
          <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100 shadow-inner animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-4 mb-8">
              <div className={`p-3 rounded-xl ${selectedService.bg}`}>
                <selectedService.icon className={`w-8 h-8 ${selectedService.color}`} />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900">{selectedService.name} Services</h2>
                <p className="text-gray-500 mt-1">Select a task below to see instant pricing and book.</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {JOBS[selectedService.id].map(job => (
                <div key={job.id} className="bg-white border border-gray-200 p-6 rounded-2xl hover:border-blue-500 hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                  <div>
                    <h4 className="font-bold text-lg text-gray-900">{job.name}</h4>
                    <div className="flex items-center text-sm text-gray-500 mt-1 gap-2">
                      <Clock className="w-4 h-4" /> <span>Est. {job.estimatedTime}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-2xl font-black text-gray-900">${job.price}</div>
                      <div className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full inline-block mt-1">Fixed Price</div>
                    </div>
                    <button 
                      onClick={() => handleJobSelect(job)}
                      className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl transition-colors group-hover:scale-105"
                    >
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <Footer />

      {/* Booking Modal */}
      {bookingStep > 0 && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl relative my-8 animate-in zoom-in-95 duration-200">
            <button 
              onClick={closeBooking}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="p-8">
              {bookingStep !== 3 && (
                <div className="mb-8 border-b border-gray-100 pb-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-bold text-blue-600 uppercase tracking-wider">Step {bookingStep} of 2</span>
                    <span className="text-2xl font-black">${selectedJob?.price}</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">{selectedJob?.name}</h3>
                  <p className="text-gray-500 mt-1 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> {selectedJob?.estimatedTime}
                  </p>
                </div>
              )}

              {/* Step 1: Date & Time */}
              {bookingStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">When do you need this done?</label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="relative">
                        <Calendar className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                        <input 
                          type="date" 
                          name="date"
                          value={bookingData.date}
                          onChange={handleInputChange}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all"
                        />
                      </div>
                      <select 
                        name="time"
                        value={bookingData.time}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all appearance-none bg-white"
                      >
                        <option value="">Select Time</option>
                        <option value="morning">Morning (8am - 12pm)</option>
                        <option value="afternoon">Afternoon (12pm - 4pm)</option>
                        <option value="evening">Evening (4pm - 8pm)</option>
                      </select>
                    </div>
                  </div>
                  <button 
                    disabled={!bookingData.date || !bookingData.time}
                    onClick={() => setBookingStep(2)}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-2"
                  >
                    Continue <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}

              {/* Step 2: Contact Details */}
              {bookingStep === 2 && (
                <div className="space-y-5">
                  <div className="relative">
                    <User className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                    <input 
                      type="text" 
                      name="name"
                      placeholder="Your Full Name"
                      value={bookingData.name}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                    <input 
                      type="text" 
                      name="address"
                      placeholder="Service Address"
                      value={bookingData.address}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <textarea 
                    name="notes"
                    placeholder="Any specific details about the job? (Optional)"
                    value={bookingData.notes}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none resize-none"
                  ></textarea>
                  
                  <div className="flex gap-4 pt-4">
                    <button 
                      onClick={() => setBookingStep(1)}
                      className="px-6 py-4 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      Back
                    </button>
                    <button 
                      disabled={!bookingData.name || !bookingData.address || isSubmitting}
                      onClick={submitBooking}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-4 rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? 'Confirming...' : 'Confirm Booking'}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Success */}
              {bookingStep === 3 && (
                <div className="text-center py-8 space-y-6">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-10 h-10 text-green-500" />
                  </div>
                  <h3 className="text-3xl font-black text-gray-900 tracking-tight">Booking Confirmed!</h3>
                  <p className="text-gray-600 text-lg max-w-sm mx-auto">
                    We've received your request for <strong className="text-gray-900">{selectedJob?.name}</strong>. A professional will be in touch shortly to finalize details.
                  </p>
                  <div className="pt-6">
                    <button 
                      onClick={closeBooking}
                      className="bg-gray-900 hover:bg-gray-800 text-white px-8 py-4 rounded-xl font-bold text-lg transition-colors w-full sm:w-auto"
                    >
                      Back to Home
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
