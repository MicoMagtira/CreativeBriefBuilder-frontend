import React, { createContext, useContext, useState, useEffect } from 'react';

interface BriefIdContextType {
  briefId: string | null;
  setBriefId: (id: string | null) => void;
  resetBriefId?: () => void;
}

const BriefIdContext = createContext<BriefIdContextType | undefined>(undefined);

export const BriefIdProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [briefId, setBriefIdState] = useState<string | null>(() => {
    let stored = localStorage.getItem('briefId');
    if (!stored) {
      stored = crypto.randomUUID();
      localStorage.setItem('briefId', stored);
    }
    return stored;
  });

  useEffect(() => {
    if (briefId) {
      localStorage.setItem('briefId', briefId);
    } else {
      localStorage.removeItem('briefId');
    }
  }, [briefId]);

  const setBriefId = (id: string | null) => {
    setBriefIdState(id);
  };

  const resetBriefId = () => {
    const newId = crypto.randomUUID();
    setBriefIdState(newId);
    localStorage.setItem('briefId', newId);
  };

  return (
    <BriefIdContext.Provider value={{ briefId, setBriefId, resetBriefId }}>
      {children}
    </BriefIdContext.Provider>
  );
};

export const useBriefId = () => {
  const context = useContext(BriefIdContext);
  if (!context) {
    throw new Error('useBriefId must be used within a BriefIdProvider');
  }
  return context;
};
