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
        if (!parsed.procedures) parsed.procedures = DEFAULT_PATIENT_RECORD.procedures || [];
        if (!parsed.vaccinations) parsed.vaccinations = DEFAULT_PATIENT_RECORD.vaccinations || [];
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
  const [isNewPatient, setIsNewPatient] = useState(false);

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
          setIsNewPatient(false);
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
        setIsNewPatient(false);
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
      const [profileRes, condsRes, surgsRes, medsRes, procsRes, vaxRes] = await Promise.all([
        supabase.from("patient_profile").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("patient_conditions").select("*").eq("user_id", userId),
        supabase.from("patient_surgeries").select("*").eq("user_id", userId),
        supabase.from("patient_medications").select("*").eq("user_id", userId),
        supabase.from("patient_procedures").select("*").eq("user_id", userId),
        supabase.from("patient_vaccinations").select("*").eq("user_id", userId)
      ]);

      const totalRecords =
        (condsRes.data?.length || 0) +
        (surgsRes.data?.length || 0) +
        (medsRes.data?.length || 0) +
        (procsRes.data?.length || 0) +
        (vaxRes.data?.length || 0);

      // If user has zero health records in database, flag as new patient for onboarding
      const isFirstTime = totalRecords === 0 && !profileRes.data?.dob;
      setIsNewPatient(isFirstTime);

      const newConditions = (condsRes.data && condsRes.data.length > 0)
        ? condsRes.data
        : (isFirstTime ? [] : patientData.conditions);

      const newSurgeries = (surgsRes.data && surgsRes.data.length > 0)
        ? surgsRes.data
        : (isFirstTime ? [] : patientData.surgeries);

      const newMedications = (medsRes.data && medsRes.data.length > 0)
        ? medsRes.data
        : (isFirstTime ? [] : patientData.medications);

      const newProcedures = (procsRes.data && procsRes.data.length > 0)
        ? procsRes.data
        : (isFirstTime ? [] : (patientData.procedures || []));

      const newVaccinations = (vaxRes.data && vaxRes.data.length > 0)
        ? vaxRes.data
        : (isFirstTime ? [] : (patientData.vaccinations || []));

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
      } : (isFirstTime ? {
        ...patientData.profile,
        name: user?.user_metadata?.full_name || user?.email?.split("@")[0] || "New Patient",
        mrn: `#PT-${Math.floor(10000 + Math.random() * 90000)}`
      } : patientData.profile);

      setPatientData({
        profile: newProfile,
        conditions: newConditions,
        surgeries: newSurgeries,
        medications: newMedications,
        procedures: newProcedures,
        vaccinations: newVaccinations,
        drains: isFirstTime ? [] : (patientData.drains || []),
        lines: isFirstTime ? [] : (patientData.lines || []),
        allergiesList: isFirstTime ? [] : (patientData.allergiesList || [])
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

  // Procedure CRUD
  const addProcedure = useCallback((procedure) => {
    const newProc = {
      ...procedure,
      id: procedure.id || `proc-${Date.now()}`,
      procedure_name: procedure.procedure_name || procedure.name || "Diagnostic Procedure",
      procedure_type: procedure.procedure_type || procedure.procedureType || "diagnostic",
      date_performed: procedure.date_performed || procedure.datePerformed || new Date().toISOString().split("T")[0],
      anatomical_marker: procedure.anatomical_marker || procedure.anatomicalMarker || "General",
      performing_clinician: procedure.performing_clinician || procedure.performingClinician || "",
      institution: procedure.institution || "",
      findings: procedure.findings || "",
      recall_interval_years: procedure.recall_interval_years !== undefined ? Number(procedure.recall_interval_years) : 1,
      coords: procedure.coords || { x: 0.1, y: 1.8, z: 1.05 },
      system: procedure.system || "general"
    };
    setPatientData(prev => {
      const next = { ...prev, procedures: [newProc, ...(prev.procedures || [])] };
      if (user) {
        supabase.from("patient_procedures").insert({
          id: newProc.id,
          user_id: user.id,
          procedure_name: newProc.procedure_name,
          procedure_type: newProc.procedure_type,
          date_performed: newProc.date_performed,
          anatomical_marker: newProc.anatomical_marker,
          performing_clinician: newProc.performing_clinician,
          institution: newProc.institution,
          findings: newProc.findings,
          recall_interval_years: newProc.recall_interval_years
        }).catch(console.error);
      }
      return next;
    });
    return newProc;
  }, [user]);

  const updateProcedure = useCallback((id, updates) => {
    setPatientData(prev => {
      const next = {
        ...prev,
        procedures: (prev.procedures || []).map(p => p.id === id ? { ...p, ...updates } : p)
      };
      if (user) {
        const dbUpdates = { ...updates };
        if (updates.name) dbUpdates.procedure_name = updates.name;
        if (updates.procedureType) dbUpdates.procedure_type = updates.procedureType;
        if (updates.datePerformed) dbUpdates.date_performed = updates.datePerformed;
        if (updates.anatomicalMarker) dbUpdates.anatomical_marker = updates.anatomicalMarker;
        if (updates.performingClinician) dbUpdates.performing_clinician = updates.performingClinician;
        if (updates.recallIntervalYears !== undefined) dbUpdates.recall_interval_years = Number(updates.recallIntervalYears);

        supabase.from("patient_procedures").update(dbUpdates).eq("id", id).eq("user_id", user.id).catch(console.error);
      }
      return next;
    });
  }, [user]);

  const deleteProcedure = useCallback((id) => {
    setPatientData(prev => {
      const next = {
        ...prev,
        procedures: (prev.procedures || []).filter(p => p.id !== id)
      };
      if (user) {
        supabase.from("patient_procedures").delete().eq("id", id).eq("user_id", user.id).catch(console.error);
      }
      return next;
    });
  }, [user]);

  // Vaccination CRUD
  const addVaccination = useCallback((vaccine) => {
    const newVax = {
      ...vaccine,
      id: vaccine.id || `vax-${Date.now()}`,
      vaccine_name: vaccine.vaccine_name || vaccine.name || "Immunization",
      date_administered: vaccine.date_administered || vaccine.dateAdministered || new Date().toISOString().split("T")[0],
      dose_number: Number(vaccine.dose_number || vaccine.doseNumber || 1),
      administering_facility: vaccine.administering_facility || vaccine.administeringFacility || "",
      next_due_date: vaccine.next_due_date || vaccine.nextDueDate || null
    };
    setPatientData(prev => {
      const next = { ...prev, vaccinations: [newVax, ...(prev.vaccinations || [])] };
      if (user) {
        supabase.from("patient_vaccinations").insert({
          id: newVax.id,
          user_id: user.id,
          vaccine_name: newVax.vaccine_name,
          date_administered: newVax.date_administered,
          dose_number: newVax.dose_number,
          administering_facility: newVax.administering_facility,
          next_due_date: newVax.next_due_date
        }).catch(console.error);
      }
      return next;
    });
    return newVax;
  }, [user]);

  const updateVaccination = useCallback((id, updates) => {
    setPatientData(prev => {
      const next = {
        ...prev,
        vaccinations: (prev.vaccinations || []).map(v => v.id === id ? { ...v, ...updates } : v)
      };
      if (user) {
        const dbUpdates = { ...updates };
        if (updates.name) dbUpdates.vaccine_name = updates.name;
        if (updates.dateAdministered) dbUpdates.date_administered = updates.dateAdministered;
        if (updates.doseNumber !== undefined) dbUpdates.dose_number = Number(updates.doseNumber);
        if (updates.administeringFacility) dbUpdates.administering_facility = updates.administeringFacility;
        if (updates.nextDueDate !== undefined) dbUpdates.next_due_date = updates.nextDueDate;

        supabase.from("patient_vaccinations").update(dbUpdates).eq("id", id).eq("user_id", user.id).catch(console.error);
      }
      return next;
    });
  }, [user]);

  const deleteVaccination = useCallback((id) => {
    setPatientData(prev => {
      const next = {
        ...prev,
        vaccinations: (prev.vaccinations || []).filter(v => v.id !== id)
      };
      if (user) {
        supabase.from("patient_vaccinations").delete().eq("id", id).eq("user_id", user.id).catch(console.error);
      }
      return next;
    });
  }, [user]);

  // Batch commit onboarding data (from Intake Wizard or PDF Import)
  const batchCommitOnboardingData = useCallback(async (payload) => {
    const updatedProfile = {
      ...patientData.profile,
      ...(payload.profile || {})
    };

    const newConditions = payload.conditions !== undefined ? payload.conditions : patientData.conditions;
    const newSurgeries = payload.surgeries !== undefined ? payload.surgeries : patientData.surgeries;
    const newMedications = payload.medications !== undefined ? payload.medications : patientData.medications;
    const newProcedures = payload.procedures !== undefined ? payload.procedures : (patientData.procedures || []);
    const newVaccinations = payload.vaccinations !== undefined ? payload.vaccinations : (patientData.vaccinations || []);

    const updated = {
      ...patientData,
      profile: updatedProfile,
      conditions: newConditions,
      surgeries: newSurgeries,
      medications: newMedications,
      procedures: newProcedures,
      vaccinations: newVaccinations
    };

    setPatientData(updated);
    setIsNewPatient(false);

    if (user) {
      setSyncStatus("syncing");
      try {
        await supabase.from("patient_profile").upsert({
          user_id: user.id,
          name: updatedProfile.name,
          dob: updatedProfile.dob,
          age: updatedProfile.age,
          sex: updatedProfile.sex,
          build: updatedProfile.build,
          skin_tone: updatedProfile.skinTone,
          mrn: updatedProfile.mrn,
          pcp: updatedProfile.pcp,
          emergency_contact: updatedProfile.emergencyContact,
          allergies: updatedProfile.allergies,
          updated_at: new Date().toISOString()
        });

        if (newConditions.length > 0) {
          const rows = newConditions.map(c => ({
            id: c.id || `cond-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            user_id: user.id,
            name: c.name,
            region: c.region || "General",
            icd10: c.icd10 || null,
            onset_date: c.onsetDate || c.onset_date || null,
            status: c.status || "Active",
            provider: c.provider || null,
            coords: c.coords || { x: 0, y: 3.5, z: 1.0 },
            system: c.system || "general",
            notes: c.notes || null
          }));
          await supabase.from("patient_conditions").upsert(rows);
        }

        if (newSurgeries.length > 0) {
          const rows = newSurgeries.map(s => ({
            id: s.id || `surg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            user_id: user.id,
            name: s.name,
            site: s.site || "General",
            surgery_date: s.surgeryDate || s.surgery_date || null,
            hospital: s.hospital || null,
            surgeon: s.surgeon || null,
            incision: s.incision || null,
            coords: s.coords || { x: 0, y: 3.0, z: 1.0 },
            system: s.system || "general",
            notes: s.notes || null
          }));
          await supabase.from("patient_surgeries").upsert(rows);
        }

        if (newMedications.length > 0) {
          const rows = newMedications.map(m => ({
            id: m.id || `med-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            user_id: user.id,
            name: m.name,
            dosage: m.dosage || "Standard Dose",
            route: m.route || "Oral (PO)",
            frequency: m.frequency || "Once Daily",
            indication: m.indication || "",
            start_date: m.startDate || m.start_date || null,
            prescriber: m.prescriber || null,
            system: m.system || "general",
            notes: m.notes || null
          }));
          await supabase.from("patient_medications").upsert(rows);
        }

        if (newProcedures.length > 0) {
          const rows = newProcedures.map(p => ({
            id: p.id || `proc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            user_id: user.id,
            procedure_name: p.procedure_name || p.name,
            procedure_type: p.procedure_type || p.procedureType || "diagnostic",
            date_performed: p.date_performed || p.datePerformed || null,
            anatomical_marker: p.anatomical_marker || p.anatomicalMarker || "General",
            performing_clinician: p.performing_clinician || p.performingClinician || null,
            institution: p.institution || null,
            findings: p.findings || null,
            recall_interval_years: p.recall_interval_years ? Number(p.recall_interval_years) : null
          }));
          await supabase.from("patient_procedures").upsert(rows);
        }

        if (newVaccinations.length > 0) {
          const rows = newVaccinations.map(v => ({
            id: v.id || `vax-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            user_id: user.id,
            vaccine_name: v.vaccine_name || v.name,
            date_administered: v.date_administered || v.dateAdministered || null,
            dose_number: v.dose_number ? Number(v.dose_number) : 1,
            administering_facility: v.administering_facility || v.administeringFacility || null,
            next_due_date: v.next_due_date || v.nextDueDate || null
          }));
          await supabase.from("patient_vaccinations").upsert(rows);
        }

        setSyncStatus("synced");
      } catch (err) {
        console.error("Batch commit to Supabase error:", err);
        setSyncStatus("error");
      }
    }
  }, [user, patientData]);

  // Reset to default seed
  const resetToDefault = useCallback(() => {
    const defaultData = JSON.parse(JSON.stringify(DEFAULT_PATIENT_RECORD));
    setPatientData(defaultData);
    setIsNewPatient(false);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    patientData,
    user,
    authLoading,
    syncStatus,
    isNewPatient,
    setIsNewPatient,
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
    addProcedure,
    updateProcedure,
    deleteProcedure,
    addVaccination,
    updateVaccination,
    deleteVaccination,
    batchCommitOnboardingData,
    resetToDefault
  };
}
