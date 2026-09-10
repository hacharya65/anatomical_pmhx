import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { DEFAULT_PATIENT_RECORD } from "../lib/clinicalCatalog";

const STORAGE_KEY = "anatomical_pmhx_v6_spine_perspectives";

export function usePatientData() {
  const [patientData, setPatientData] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.drains) parsed.drains = DEFAULT_PATIENT_RECORD.drains || [];
        if (!parsed.lines) parsed.lines = DEFAULT_PATIENT_RECORD.lines || [];
        if (!parsed.allergiesList) parsed.allergiesList = DEFAULT_PATIENT_RECORD.allergiesList || [];
        parsed.profile = { ...DEFAULT_PATIENT_RECORD.profile, ...(parsed.profile || {}) };
        if (parsed.profile.veteranStatus && parsed.profile.veteranStatus.length > 3) {
          parsed.profile.veteranStatus = parsed.profile.veteranStatus.toLowerCase().includes("veteran") ? "Yes" : "No";
        }
        if (parsed.profile.pcp) {
          parsed.profile.pcp = parsed.profile.pcp.replace(/\s*\(Internal Medicine\)/gi, "").trim();
        }
        if (!parsed.profile.pharmacy) {
          parsed.profile.pharmacy = DEFAULT_PATIENT_RECORD.profile.pharmacy;
        }

        // Guarantee dispensing details on medications
        if (parsed.medications) {
          parsed.medications = parsed.medications.map(m => {
            const seedMed = DEFAULT_PATIENT_RECORD.medications.find(sm => sm.id === m.id);
            return {
              lastPickedUpDate: m.lastPickedUpDate || seedMed?.lastPickedUpDate || "2026-08-28",
              lastPickedUpPharmacy: m.lastPickedUpPharmacy || seedMed?.lastPickedUpPharmacy || (parsed.profile.pharmacy?.name || "CVS Pharmacy #04821 (Cambridge, MA)"),
              refillsRemaining: m.refillsRemaining !== undefined ? m.refillsRemaining : (seedMed?.refillsRemaining ?? 2),
              daysSupply: m.daysSupply || seedMed?.daysSupply || "90-Day Supply",
              rxNumber: m.rxNumber || seedMed?.rxNumber || "Rx #649102-01",
              ...m
            };
          });
        }

        // Guarantee anti-collision coordinate calibration for seed markers
        if (parsed.surgeries) {
          parsed.surgeries = parsed.surgeries.map(s =>
            s.id === "surg-rec-1" ? { ...s, coords: { x: -0.95, y: 3.45, z: 1.05 } } :
            s.id === "surg-rec-2" ? { ...s, coords: { x: -0.75, y: -4.70, z: 0.82 } } :
            s.id === "surg-rec-3" ? { ...s, coords: { x: 0.0, y: 2.15, z: -0.95 }, isPosterior: true } : s
          );
        }
        if (parsed.drains) {
          parsed.drains = parsed.drains.map(d =>
            d.id === "drain-rec-3" ? { ...d, coords: { x: -0.42, y: 1.95, z: 1.05 } } : d
          );
        }
        if (parsed.conditions) {
          parsed.conditions = parsed.conditions.map(c =>
            c.id === "cond-rec-3" ? { ...c, coords: { x: -1.30, y: -4.05, z: 0.80 } } :
            c.id === "cond-rec-4" ? { ...c, coords: { x: 0.0, y: 2.75, z: -0.92 }, isPosterior: true } : c
          );
        }
        if (parsed.lines) {
          parsed.lines = parsed.lines.map(l =>
            l.id === "line-rec-1" ? { ...l, coords: { x: -2.35, y: 4.10, z: 0.35 } } :
            l.id === "line-rec-2" ? { ...l, coords: { x: 2.50, y: 1.35, z: 0.25 } } : l
          );
        }
        return parsed;
      }
    } catch (e) {
      console.warn("Failed to load local patient data:", e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_PATIENT_RECORD));
  });

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState("local"); // 'local' | 'synced' | 'syncing' | 'error'

  // Save to local storage on any state change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(patientData));
    } catch (e) {
      console.warn("Failed to persist patient data locally:", e);
    }
  }, [patientData]);

  // Auth listener & remote data fetcher
  useEffect(() => {
    let mounted = true;

    async function checkAuthAndLoad() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        if (session?.user) {
          setUser(session.user);
          await fetchRemoteData(session.user.id);
        } else {
          setUser(null);
          setSyncStatus("local");
        }
      } catch (err) {
        console.warn("Auth check error, operating in local mode:", err);
        setSyncStatus("local");
      } finally {
        if (mounted) setAuthLoading(false);
      }
    }

    checkAuthAndLoad();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (session?.user) {
        setUser(session.user);
        await fetchRemoteData(session.user.id);
      } else {
        setUser(null);
        setSyncStatus("local");
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Fetch data from Supabase
  const fetchRemoteData = async (userId) => {
    setSyncStatus("syncing");
    try {
      const [profileRes, condsRes, surgsRes, medsRes] = await Promise.all([
        supabase.from("patient_profile").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("patient_conditions").select("*").eq("user_id", userId),
        supabase.from("patient_surgeries").select("*").eq("user_id", userId),
        supabase.from("patient_medications").select("*").eq("user_id", userId)
      ]);

      const newConditions = (condsRes.data && condsRes.data.length > 0)
        ? condsRes.data
        : patientData.conditions;

      const newSurgeries = (surgsRes.data && surgsRes.data.length > 0)
        ? surgsRes.data
        : patientData.surgeries;

      const newMedications = (medsRes.data && medsRes.data.length > 0)
        ? medsRes.data
        : patientData.medications;

      const newProfile = profileRes.data ? {
        name: profileRes.data.name || patientData.profile.name,
        dob: profileRes.data.dob || patientData.profile.dob,
        age: profileRes.data.age || patientData.profile.age,
        sex: profileRes.data.sex || patientData.profile.sex,
        build: profileRes.data.build || patientData.profile.build,
        skinTone: profileRes.data.skin_tone || patientData.profile.skinTone,
        mrn: profileRes.data.mrn || patientData.profile.mrn,
        pcp: profileRes.data.pcp || patientData.profile.pcp,
        emergencyContact: profileRes.data.emergency_contact || patientData.profile.emergencyContact,
        allergies: profileRes.data.allergies || patientData.profile.allergies
      } : patientData.profile;

      setPatientData({
        profile: newProfile,
        conditions: newConditions,
        surgeries: newSurgeries,
        medications: newMedications
      });
      setSyncStatus("synced");
    } catch (e) {
      console.error("Remote data fetch failed, using local state:", e);
      setSyncStatus("error");
    }
  };

  // Sync current state to Supabase
  const syncToRemote = useCallback(async (updatedData) => {
    if (!user) return;
    setSyncStatus("syncing");
    try {
      const prof = updatedData.profile;
      await supabase.from("patient_profile").upsert({
        user_id: user.id,
        name: prof.name,
        dob: prof.dob,
        age: prof.age,
        sex: prof.sex,
        build: prof.build,
        skin_tone: prof.skinTone,
        mrn: prof.mrn,
        pcp: prof.pcp,
        emergency_contact: prof.emergencyContact,
        allergies: prof.allergies,
        updated_at: new Date().toISOString()
      });
      setSyncStatus("synced");
    } catch (err) {
      console.error("Sync to Supabase error:", err);
      setSyncStatus("error");
    }
  }, [user]);

  // Profile operations
  const updateProfile = useCallback((profileUpdates) => {
    setPatientData(prev => {
      // Calculate age if dob is modified
      let calculatedAge = prev.profile.age;
      if (profileUpdates.dob) {
        const birthDate = new Date(profileUpdates.dob);
        const diffYears = new Date().getFullYear() - birthDate.getFullYear();
        if (!isNaN(diffYears) && diffYears > 0 && diffYears < 125) {
          calculatedAge = diffYears;
        }
      }

      const next = {
        ...prev,
        profile: {
          ...prev.profile,
          ...profileUpdates,
          age: profileUpdates.age !== undefined ? profileUpdates.age : calculatedAge
        }
      };
      syncToRemote(next);
      return next;
    });
  }, [syncToRemote]);

  // Condition CRUD
  const addCondition = useCallback((condition) => {
    const newCond = {
      ...condition,
      id: condition.id || `cond-${Date.now()}`
    };
    setPatientData(prev => {
      const next = { ...prev, conditions: [newCond, ...prev.conditions] };
      if (user) {
        supabase.from("patient_conditions").insert({
          id: newCond.id,
          user_id: user.id,
          name: newCond.name,
          region: newCond.region,
          icd10: newCond.icd10,
          onset_date: newCond.onsetDate,
          status: newCond.status || "Active",
          provider: newCond.provider,
          coords: newCond.coords,
          system: newCond.system || "general",
          notes: newCond.notes
        }).catch(console.error);
      }
      return next;
    });
    return newCond;
  }, [user]);

  const updateCondition = useCallback((id, updates) => {
    setPatientData(prev => {
      const next = {
        ...prev,
        conditions: prev.conditions.map(c => c.id === id ? { ...c, ...updates } : c)
      };
      if (user) {
        supabase.from("patient_conditions").update({
          ...updates,
          onset_date: updates.onsetDate || undefined
        }).eq("id", id).eq("user_id", user.id).catch(console.error);
      }
      return next;
    });
  }, [user]);

  const deleteCondition = useCallback((id) => {
    setPatientData(prev => {
      const next = {
        ...prev,
        conditions: prev.conditions.filter(c => c.id !== id)
      };
      if (user) {
        supabase.from("patient_conditions").delete().eq("id", id).eq("user_id", user.id).catch(console.error);
      }
      return next;
    });
  }, [user]);

  // Surgery CRUD
  const addSurgery = useCallback((surgery) => {
    const newSurg = {
      ...surgery,
      id: surgery.id || `surg-${Date.now()}`
    };
    setPatientData(prev => {
      const next = { ...prev, surgeries: [newSurg, ...prev.surgeries] };
      if (user) {
        supabase.from("patient_surgeries").insert({
          id: newSurg.id,
          user_id: user.id,
          name: newSurg.name,
          site: newSurg.site,
          surgery_date: newSurg.surgeryDate,
          hospital: newSurg.hospital,
          surgeon: newSurg.surgeon,
          incision: newSurg.incision,
          coords: newSurg.coords,
          system: newSurg.system || "general",
          notes: newSurg.notes
        }).catch(console.error);
      }
      return next;
    });
    return newSurg;
  }, [user]);

  const updateSurgery = useCallback((id, updates) => {
    setPatientData(prev => {
      const next = {
        ...prev,
        surgeries: prev.surgeries.map(s => s.id === id ? { ...s, ...updates } : s)
      };
      if (user) {
        supabase.from("patient_surgeries").update({
          ...updates,
          surgery_date: updates.surgeryDate || undefined
        }).eq("id", id).eq("user_id", user.id).catch(console.error);
      }
      return next;
    });
  }, [user]);

  const deleteSurgery = useCallback((id) => {
    setPatientData(prev => {
      const next = {
        ...prev,
        surgeries: prev.surgeries.filter(s => s.id !== id)
      };
      if (user) {
        supabase.from("patient_surgeries").delete().eq("id", id).eq("user_id", user.id).catch(console.error);
      }
      return next;
    });
  }, [user]);

  // Medication CRUD
  const addMedication = useCallback((medication) => {
    const newMed = {
      ...medication,
      id: medication.id || `med-${Date.now()}`
    };
    setPatientData(prev => {
      const next = { ...prev, medications: [newMed, ...prev.medications] };
      if (user) {
        supabase.from("patient_medications").insert({
          id: newMed.id,
          user_id: user.id,
          name: newMed.name,
          dosage: newMed.dosage,
          route: newMed.route,
          frequency: newMed.frequency,
          indication: newMed.indication,
          start_date: newMed.startDate,
          prescriber: newMed.prescriber,
          system: newMed.system || "general",
          notes: newMed.notes
        }).catch(console.error);
      }
      return next;
    });
    return newMed;
  }, [user]);

  const updateMedication = useCallback((id, updates) => {
    setPatientData(prev => {
      const next = {
        ...prev,
        medications: prev.medications.map(m => m.id === id ? { ...m, ...updates } : m)
      };
      if (user) {
        supabase.from("patient_medications").update({
          ...updates,
          start_date: updates.startDate || undefined
        }).eq("id", id).eq("user_id", user.id).catch(console.error);
      }
      return next;
    });
  }, [user]);

  const deleteMedication = useCallback((id) => {
    setPatientData(prev => {
      const next = {
        ...prev,
        medications: prev.medications.filter(m => m.id !== id)
      };
      if (user) {
        supabase.from("patient_medications").delete().eq("id", id).eq("user_id", user.id).catch(console.error);
      }
      return next;
    });
  }, [user]);

  // Drain CRUD
  const addDrain = useCallback((drain) => {
    const newDrain = {
      ...drain,
      id: drain.id || `drain-${Date.now()}`
    };
    setPatientData(prev => ({
      ...prev,
      drains: [newDrain, ...(prev.drains || [])]
    }));
    return newDrain;
  }, []);

  const updateDrain = useCallback((id, updates) => {
    setPatientData(prev => ({
      ...prev,
      drains: (prev.drains || []).map(d => d.id === id ? { ...d, ...updates } : d)
    }));
  }, []);

  const deleteDrain = useCallback((id) => {
    setPatientData(prev => ({
      ...prev,
      drains: (prev.drains || []).filter(d => d.id !== id)
    }));
  }, []);

  // Line CRUD
  const addLine = useCallback((line) => {
    const newLine = {
      ...line,
      id: line.id || `line-${Date.now()}`
    };
    setPatientData(prev => ({
      ...prev,
      lines: [newLine, ...(prev.lines || [])]
    }));
    return newLine;
  }, []);

  const updateLine = useCallback((id, updates) => {
    setPatientData(prev => ({
      ...prev,
      lines: (prev.lines || []).map(l => l.id === id ? { ...l, ...updates } : l)
    }));
  }, []);

  const deleteLine = useCallback((id) => {
    setPatientData(prev => ({
      ...prev,
      lines: (prev.lines || []).filter(l => l.id !== id)
    }));
  }, []);

  // Allergies CRUD
  const addAllergy = useCallback((allergy) => {
    const newAllergy = {
      ...allergy,
      id: allergy.id || `allergy-${Date.now()}`
    };
    setPatientData(prev => ({
      ...prev,
      allergiesList: [newAllergy, ...(prev.allergiesList || [])]
    }));
    return newAllergy;
  }, []);

  const updateAllergy = useCallback((id, updates) => {
    setPatientData(prev => ({
      ...prev,
      allergiesList: (prev.allergiesList || []).map(a => a.id === id ? { ...a, ...updates } : a)
    }));
  }, []);

  const deleteAllergy = useCallback((id) => {
    setPatientData(prev => ({
      ...prev,
      allergiesList: (prev.allergiesList || []).filter(a => a.id !== id)
    }));
  }, []);

  // Reset to default seed
  const resetToDefault = useCallback(() => {
    const defaultData = JSON.parse(JSON.stringify(DEFAULT_PATIENT_RECORD));
    setPatientData(defaultData);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    patientData,
    user,
    authLoading,
    syncStatus,
    updateProfile,
    addAllergy,
    updateAllergy,
    deleteAllergy,
    addCondition,
    updateCondition,
    deleteCondition,
    addSurgery,
    updateSurgery,
    deleteSurgery,
    addDrain,
    updateDrain,
    deleteDrain,
    addLine,
    updateLine,
    deleteLine,
    addMedication,
    updateMedication,
    deleteMedication,
    resetToDefault
  };
}
