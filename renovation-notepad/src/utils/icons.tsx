import React from 'react';
import {
  Sofa, Utensils, Bath, Bed, BookOpen, User, Flower2, Home,
  AlertCircle, Clock, CheckCircle2
} from 'lucide-react';

export const getRoomIcon = (iconName: string): React.ReactNode => {
  switch (iconName) {
    case 'sofa': return <Sofa className="w-4 h-4" />;
    case 'utensils': return <Utensils className="w-4 h-4" />;
    case 'bath': return <Bath className="w-4 h-4" />;
    case 'bed': return <Bed className="w-4 h-4" />;
    case 'book': return <BookOpen className="w-4 h-4" />;
    case 'user': return <User className="w-4 h-4" />;
    case 'flower': return <Flower2 className="w-4 h-4" />;
    default: return <Home className="w-4 h-4" />;
  }
};

export const getStatusIcon = (iconName: string): React.ReactNode => {
  switch (iconName) {
    case 'alert': return <AlertCircle className="w-4 h-4" />;
    case 'clock': return <Clock className="w-4 h-4" />;
    case 'check': return <CheckCircle2 className="w-4 h-4" />;
    default: return <AlertCircle className="w-4 h-4" />;
  }
};
