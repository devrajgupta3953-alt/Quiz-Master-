import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Zap, Users, ShieldCheck, LayoutGrid, ArrowRight } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  const features = [
    {
      title: 'Interactive Flashcards',
      description: 'Master any subject with our dynamic flashcard system that adapts to your learning pace.',
      icon: <LayoutGrid className="w-8 h-8 text-indigo-500" />,
      color: 'bg-indigo-50'
    },
    {
      title: 'Real-time Competition',
      description: 'Join live rooms and compete with others in real-time. Fast answers get more points!',
      icon: <Zap className="w-8 h-8 text-yellow-500" />,
      color: 'bg-yellow-50'
    },
    {
      title: 'Live Hosting',
      description: 'Host your own sessions, create custom quizzes, and track participant progress instantly.',
      icon: <ShieldCheck className="w-8 h-8 text-emerald-500" />,
      color: 'bg-emerald-50'
    },
    {
      title: 'Multi-User Sync',
      description: 'Seamless synchronization across all participants for a truly collaborative experience.',
      icon: <Users className="w-8 h-8 text-blue-500" />,
      color: 'bg-blue-50'
    }
  ];

  const infoSections = [
    {
      title: 'Learn Together, Win Together',
      text: 'Our platform brings people together through interactive learning. Whether you are in a classroom or a study group, LiveQuiz Master makes it easy to stay engaged.',
      image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&auto=format&fit=crop&q=60'
    },
    {
      title: 'Create Your Own Knowledge',
      text: 'Easily build custom quizzes and flashcards tailored to your specific needs. Use our intuitive editor to craft questions and manage your library.',
      image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60'
    }
  ];

  return (
    <div className="min-h-screen bg-bg">
      {/* Hero Section */}
      <nav className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center bg-surface sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Zap className="w-8 h-8 text-brand fill-brand" />
          <span className="text-2xl font-bold tracking-tight text-brand">LiveQuiz</span>
        </div>
        <button 
          onClick={() => navigate('/login')}
          className="quizlet-btn-primary py-2 text-sm"
        >
          LOG IN
        </button>
      </nav>

      <section className="max-w-7xl mx-auto px-6 py-20 text-center">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-6xl font-bold tracking-tight text-text-main mb-6 leading-tight"
        >
          The most interactive way <br /> to <span className="text-brand">master</span> your subjects.
        </motion.h1>
        <p className="text-xl text-text-sub max-w-2xl mx-auto mb-10">
          Join millions of learners using LiveQuiz Master to study better, faster, and more effectively.
        </p>
        <button 
          onClick={() => navigate('/login')}
          className="quizlet-btn-primary text-xl px-12 py-5 shadow-xl hover:scale-105"
        >
          Get Started for Free
        </button>
      </section>

      {/* Feature Cards Grid */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold mb-12 text-center">Engineered for Excellence</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="quizlet-card flex flex-col items-center text-center p-10 hover:shadow-lg border-2 border-transparent hover:border-brand/20"
              >
                <div className={`w-16 h-16 ${f.color} rounded-2xl flex items-center justify-center mb-6`}>
                  {f.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                <p className="text-text-sub font-medium">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Alternating Info Sections */}
      <section className="py-20 space-y-40">
        {infoSections.map((section, i) => (
          <div key={i} className={`max-w-7xl mx-auto px-6 flex flex-col ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} items-center gap-16`}>
            <div className="flex-1 space-y-8">
              <h2 className="text-4xl font-bold leading-tight">{section.title}</h2>
              <p className="text-xl text-text-sub leading-relaxed font-medium">{section.text}</p>
              <button 
                onClick={() => navigate('/login')}
                className={`quizlet-btn-primary flex items-center gap-2 group ${i % 2 === 0 ? 'mr-auto' : 'ml-auto'}`}
              >
                Get Started 
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            <div className="flex-1">
              <img 
                src={section.image} 
                alt={section.title}
                className="rounded-[2.5rem] shadow-2xl border-8 border-white object-cover aspect-video"
              />
            </div>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer className="bg-text-main text-white py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <Zap className="w-6 h-6 text-brand fill-brand" />
            <span className="text-xl font-bold">LiveQuiz Master</span>
          </div>
          <div className="flex gap-8 text-sm opacity-50 font-medium">
            <a href="#" className="hover:opacity-100">Help Center</a>
            <a href="#" className="hover:opacity-100">Privacy Policy</a>
            <a href="#" className="hover:opacity-100">Terms of Service</a>
          </div>
          <p className="text-sm opacity-30">© 2026 LiveQuiz Master. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
