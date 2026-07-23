"use client";

import { createContext, useContext, useState, ReactNode } from "react";

const currentYear = new Date().getFullYear();

interface YearContextValue {
  tahunDari: number;
  tahunSampai: number;
  setTahunDari: (v: number) => void;
  setTahunSampai: (v: number) => void;
}

const YearContext = createContext<YearContextValue>({
  tahunDari: currentYear,
  tahunSampai: currentYear,
  setTahunDari: () => {},
  setTahunSampai: () => {},
});

export function YearProvider({ children }: { children: ReactNode }) {
  const [tahunDari, setTahunDari] = useState(currentYear);
  const [tahunSampai, setTahunSampai] = useState(currentYear);

  return (
    <YearContext.Provider value={{ tahunDari, tahunSampai, setTahunDari, setTahunSampai }}>
      {children}
    </YearContext.Provider>
  );
}

export function useYear() {
  return useContext(YearContext);
}
