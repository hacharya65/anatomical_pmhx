import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { DEFAULT_PATIENT_RECORD, localizeConditionAnatomically } from "../lib/clinicalCatalog";

const GUEST_STORAGE_KEY = "anatomical_pmhx_guest_demo_v2";
const getUserStorageKey = (userId) => `anatomical_pmhx_user_${userId}_v2`;

export const createDefaultBlankPatient = (currentUser) => {
  const defaultName = currentUser?.user_metadata?.full_name || "";
  return {
    profile: {
      name: defaultName,
      dob: "",
      age: "",
      sex: "female",
      gender: "Female",
      build: "medium",
      skinTone: "#d4a373",
      mrn: `#PT-${Math.floor(10000 + Math.random() * 90000)}`,
      phone: "",
      email: currentUser?.email || "",
      address: "",
      veteranStatus: "No",
      preferredLanguage: "English",
      bloodType: "I don't know",
      pcp: "",
      pcpPhone: "",
      clinic: "",
      emergencyContactFirstName: "",
      emergencyContactLastName: "",
      emergencyContactName: "",
      emergencyContactRelation: "Spouse",
      emergencyContactPhone: "",
      emergencyContact: "",
      allergies: "No Known Drug Allergies (NKDA)",
      pharmacy: null
    },
    allergiesList: [],
    conditions: [],
    surgeries: [],
    medications: [],
    procedures: [],
    vaccinations: [],
    drains: [],
    lines: []
  };
};

export function usePatientData() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState("local"); // 'local' | 'synced' | 'syncing' | 'error'
  const [isNewPatient, setIsNewPatient] = useState(false);

  // Initialize state: defaults to fresh Elena Vance demo for unauthenticated / demo mode.
  // We explicitly do NOT read mutated guest data from localStorage so that refreshing
  // resets the demo patient back to pristine Elena Vance.
  const [patientData, setPatientData] = useState(() => {
    return JSON.parse(JSON.stringify(DEFAULT_PATIENT_RECORD));
  });

  // Save to user-specific local storage on any state change ONLY when authenticated!
  // In demo mode, changes remain in-memory for the active session, so refreshing always restores Elena Vance.
  useEffect(() => {
    try {
      if (user?.id) {
        localStorage.setItem(getUserStorageKey(user.id), JSON.stringify(patientData));
      }
    } catch (e) {
      console.warn("Failed to persist patient data locally:", e);
    }
  }, [patientData, user]);

  // Clear any legacy guest storage on mount to guarantee fresh session
  useEffect(() => {
    try {
      localStorage.removeItem(GUEST_STORAGE_KEY);
    } catch (_) {}
  }, []);

  // Remote data fetcher: queries Supabase and isolates user data
  const fetchRemoteData = useCallback(async (userId, currentUser) => {
    setSyncStatus("syncing");
    try {
      const [
        profileRes,
        condsRes,
        surgsRes,
        medsRes,
        procsRes,
        vaxRes
      ] = await Promise.allSettled([
        supabase.from("patient_profile").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("patient_conditions").select("*").eq("user_id", userId),
        supabase.from("patient_surgeries").select("*").eq("user_id", userId),
        supabase.from("patient_medications").select("*").eq("user_id", userId),
        supabase.from("patient_procedures").select("*").eq("user_id", userId),
        supabase.from("patient_vaccinations").select("*").eq("user_id", userId)
      ]);

      const profileData = profileRes.status === "fulfilled" && !profileRes.value.error ? profileRes.value.data : null;
      const condsData = condsRes.status === "fulfilled" && !condsRes.value.error ? (condsRes.value.data || []) : null;
      const surgsData = surgsRes.status === "fulfilled" && !surgsRes.value.error ? (surgsRes.value.data || []) : null;
      const medsData = medsRes.status === "fulfilled" && !medsRes.value.error ? (medsRes.value.data || []) : null;
      const procsData = procsRes.status === "fulfilled" && !procsRes.value.error ? (procsRes.value.data || []) : null;
      const vaxData = vaxRes.status === "fulfilled" && !vaxRes.value.error ? (vaxRes.value.data || []) : null;

      // Calculate total records to detect onboarding requirement
      const totalRecords =
        (condsData?.length || 0) +
        (surgsData?.length || 0) +
        (medsData?.length || 0) +
        (procsData?.length || 0) +
        (vaxData?.length || 0);

      const isFirstTime = totalRecords === 0 && !profileData?.dob;
      setIsNewPatient(isFirstTime);

      // Conditions: map DB snake_case to camelCase
      const newConditions = condsData !== null
        ? condsData.map(c => ({
            ...c,
            onsetDate: c.onset_date || c.onsetDate || "",
            facility: c.facility || "",
            laterality: c.laterality || "",
            provider: c.provider || "",
            coords: c.coords || { x: 0, y: 3.5, z: 1.0 }
          }))
        : [];

      // Surgeries: map DB snake_case to camelCase
      const newSurgeries = surgsData !== null
        ? surgsData.map(s => ({
            ...s,
            surgeryDate: s.surgery_date || s.surgeryDate || "",
            surgeon: s.surgeon || "",
            hospital: s.hospital || "",
            laterality: s.laterality || "",
            coords: s.coords || { x: 0, y: 3.0, z: 1.0 }
          }))
        : [];

      // Medications: map DB snake_case to camelCase
      const newMedications = medsData !== null
        ? medsData.map(m => ({
            ...m,
            startDate: m.start_date || m.startDate || "",
            dosage: m.dosage || "Standard Dose",
            frequency: m.frequency || "Once Daily",
            indication: m.indication || "",
            route: m.route || "Oral (PO)",
            prescriber: m.prescriber || "",
            facility: m.facility || "",
            daysSupply: m.days_supply !== undefined && m.days_supply !== null ? m.days_supply : (m.daysSupply || ""),
            days_supply: m.days_supply !== undefined && m.days_supply !== null ? m.days_supply : (m.daysSupply || ""),
            lastPickedUpDate: m.last_picked_up_date || m.lastPickedUpDate || "",
            last_picked_up_date: m.last_picked_up_date || m.lastPickedUpDate || "",
            lastPickedUpPharmacy: m.last_picked_up_pharmacy || m.lastPickedUpPharmacy || "",
            last_picked_up_pharmacy: m.last_picked_up_pharmacy || m.lastPickedUpPharmacy || "",
            quantityAmount: m.quantity_amount || m.quantityAmount || "",
            quantity_amount: m.quantity_amount || m.quantityAmount || "",
            refillsRemaining: m.refills_remaining !== undefined && m.refills_remaining !== null ? m.refills_remaining : (m.refillsRemaining !== undefined ? m.refillsRemaining : ""),
            refills_remaining: m.refills_remaining !== undefined && m.refills_remaining !== null ? m.refills_remaining : (m.refillsRemaining !== undefined ? m.refillsRemaining : ""),
            rxNumber: m.rx_number || m.rxNumber || "",
            rx_number: m.rx_number || m.rxNumber || ""
          }))
        : [];

      // Procedures: map DB fields
      const newProcedures = procsData !== null
        ? procsData.map(p => ({
            ...p,
            name: p.procedure_name || p.name || "Procedure",
            procedure_name: p.procedure_name || p.name || "Procedure",
            procedure_type: p.procedure_type || p.procedureType || "diagnostic",
            datePerformed: p.date_performed || p.datePerformed || "",
            date_performed: p.date_performed || p.datePerformed || "",
            anatomical_marker: p.anatomical_marker || p.anatomicalMarker || "General",
            performing_clinician: p.performing_clinician || p.performingClinician || "",
            performingClinician: p.performing_clinician || p.performingClinician || "",
            institution: p.institution || "",
            findings: p.findings || "",
            recall_interval_years: p.recall_interval_years !== undefined ? p.recall_interval_years : 1,
            coords: p.coords || { x: 0.1, y: 1.8, z: 1.05 }
          }))
        : [];

      // Vaccinations: map DB fields
      const newVaccinations = vaxData !== null
        ? vaxData.map(v => ({
            ...v,
            name: v.vaccine_name || v.name || "Vaccination",
            vaccine_name: v.vaccine_name || v.name || "Vaccination",
            dateAdministered: v.date_administered || v.dateAdministered || "",
            date_administered: v.date_administered || v.dateAdministered || "",
            doseNumber: v.dose_number !== undefined ? v.dose_number : 1,
            dose_number: v.dose_number !== undefined ? v.dose_number : 1,
            administering_facility: v.administering_facility || v.administeringFacility || "",
            administeringFacility: v.administering_facility || v.administeringFacility || "",
            lotNumber: v.lot_number || v.lotNumber || "",
            lot_number: v.lot_number || v.lotNumber || "",
            nextDueDate: v.next_due_date || v.nextDueDate || "",
            next_due_date: v.next_due_date || v.nextDueDate || ""
          }))
        : [];

      // Profile: Build isolated profile for the user
      const defaultUser = currentUser || user;
      const baseBlank = createDefaultBlankPatient(defaultUser).profile;

      const ecFirstName = profileData?.emergency_contact_first_name || (profileData?.emergency_contact_name ? profileData.emergency_contact_name.split(" ")[0] : "");
      const ecLastName = profileData?.emergency_contact_last_name || (profileData?.emergency_contact_name ? profileData.emergency_contact_name.split(" ").slice(1).join(" ") : "");
      const ecFullName = profileData?.emergency_contact_name || (ecFirstName ? `${ecFirstName} ${ecLastName}`.trim() : "");

      const newProfile = profileData ? {
        ...baseBlank,
        name: profileData.name || baseBlank.name,
        dob: profileData.dob || "",
        age: profileData.age !== undefined && profileData.age !== null ? profileData.age : baseBlank.age,
        sex: profileData.sex || baseBlank.sex,
        gender: profileData.gender || baseBlank.gender,
        build: profileData.build || baseBlank.build,
        skinTone: profileData.skin_tone || baseBlank.skinTone,
        mrn: profileData.mrn || baseBlank.mrn,
        phone: profileData.phone || "",
        email: profileData.email || defaultUser?.email || "",
        address: profileData.address || "",
        veteranStatus: profileData.veteran_status || "No",
        preferredLanguage: profileData.preferred_language || baseBlank.preferredLanguage,
        bloodType: profileData.blood_type || "I don't know",
        pcp: profileData.pcp || "",
        pcpPhone: profileData.pcp_phone || "",
        clinic: profileData.clinic || "",
        emergencyContactFirstName: ecFirstName,
        emergencyContactLastName: ecLastName,
        emergencyContactName: ecFullName,
        emergencyContactRelation: profileData.emergency_contact_relation || "Spouse",
        emergencyContactPhone: profileData.emergency_contact_phone || "",
        emergencyContact: profileData.emergency_contact || (ecFullName ? `${ecFullName} (${profileData.emergency_contact_relation || 'Contact'}) • ${profileData.emergency_contact_phone || ''}` : ""),
        allergies: profileData.allergies || "",
        pharmacy: profileData.pharmacy || null
      } : baseBlank;

      // Extract structured allergies list from allergies text if available
      let derivedAllergiesList = [];
      if (newProfile.allergies && newProfile.allergies !== "No Known Drug Allergies (NKDA)") {
        derivedAllergiesList = newProfile.allergies.split(",").map((str, idx) => {
          const match = str.trim().match(/^([^(]+)(?:\(([^)]+)\))?/);
          return {
            id: `allg-derived-${idx}`,
            drugName: match ? match[1].trim() : str.trim(),
            medication: match ? match[1].trim() : str.trim(),
            reactionType: match && match[2] ? match[2].trim() : "Adverse Reaction",
            reaction: match && match[2] ? match[2].trim() : "Adverse Reaction"
          };
        });
      }

      const nextPatientData = {
        profile: newProfile,
        conditions: newConditions,
        surgeries: newSurgeries,
        medications: newMedications,
        procedures: newProcedures,
        vaccinations: newVaccinations,
        drains: [],
        lines: [],
        allergiesList: derivedAllergiesList
      };

      setPatientData(nextPatientData);
      try {
        localStorage.setItem(getUserStorageKey(userId), JSON.stringify(nextPatientData));
      } catch (_) {}
      setSyncStatus("synced");
    } catch (e) {
      console.error("Remote data fetch failed:", e);
      setSyncStatus("error");
    }
  }, [user]);

  // Auth listener & remote data fetcher
  useEffect(() => {
    let mounted = true;

    async function checkAuthAndLoad() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        if (session?.user) {
          setUser(session.user);
          // Load cached user data first if available to avoid flashing Elena Vance
          try {
            const cached = localStorage.getItem(getUserStorageKey(session.user.id));
            if (cached) {
              setPatientData(JSON.parse(cached));
            } else {
              setPatientData(createDefaultBlankPatient(session.user));
            }
          } catch (_) {}
          await fetchRemoteData(session.user.id, session.user);
        } else {
          setUser(null);
          setSyncStatus("local");
          setIsNewPatient(false);
          // When not authenticated, load guest demo data
          try {
            const savedGuest = localStorage.getItem(GUEST_STORAGE_KEY);
            if (savedGuest) {
              setPatientData(JSON.parse(savedGuest));
            } else {
              setPatientData(JSON.parse(JSON.stringify(DEFAULT_PATIENT_RECORD)));
            }
          } catch (_) {
            setPatientData(JSON.parse(JSON.stringify(DEFAULT_PATIENT_RECORD)));
          }
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
        try {
          const cached = localStorage.getItem(getUserStorageKey(session.user.id));
          if (cached) {
            setPatientData(JSON.parse(cached));
          } else {
            setPatientData(createDefaultBlankPatient(session.user));
          }
        } catch (_) {}
        await fetchRemoteData(session.user.id, session.user);
      } else {
        setUser(null);
        setSyncStatus("local");
        setIsNewPatient(false);
        // Reset state to clean guest demo record on sign out
        try {
          const savedGuest = localStorage.getItem(GUEST_STORAGE_KEY);
          if (savedGuest) {
            setPatientData(JSON.parse(savedGuest));
          } else {
            setPatientData(JSON.parse(JSON.stringify(DEFAULT_PATIENT_RECORD)));
          }
        } catch (_) {
          setPatientData(JSON.parse(JSON.stringify(DEFAULT_PATIENT_RECORD)));
        }
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [fetchRemoteData]);

  // Sync current profile to Supabase
  const syncToRemote = useCallback(async (updatedData) => {
    if (!user) return;
    setSyncStatus("syncing");
    try {
      const prof = updatedData.profile;
      const ecName = prof.emergencyContactName || [prof.emergencyContactFirstName, prof.emergencyContactLastName].filter(Boolean).join(" ");
      const { error } = await supabase.from("patient_profile").upsert({
        user_id: user.id,
        name: prof.name || "Patient",
        dob: prof.dob || null,
        age: prof.age ? Number(prof.age) : null,
        sex: prof.sex || "female",
        build: prof.build || "medium",
        skin_tone: prof.skinTone || "#d4a373",
        mrn: prof.mrn || null,
        phone: prof.phone || null,
        email: prof.email || null,
        address: prof.address || null,
        veteran_status: prof.veteranStatus || "No",
        preferred_language: prof.preferredLanguage || "English",
        blood_type: prof.bloodType || null,
        pcp: prof.pcp || null,
        pcp_phone: prof.pcpPhone || null,
        clinic: prof.clinic || null,
        emergency_contact: prof.emergencyContact || null,
        emergency_contact_first_name: prof.emergencyContactFirstName || null,
        emergency_contact_last_name: prof.emergencyContactLastName || null,
        emergency_contact_name: ecName || null,
        emergency_contact_relation: prof.emergencyContactRelation || null,
        emergency_contact_phone: prof.emergencyContactPhone || null,
        allergies: prof.allergies || null,
        pharmacy: prof.pharmacy || null,
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id" });

      if (error) {
        console.error("Sync profile to Supabase error:", error);
        setSyncStatus("error");
      } else {
        setSyncStatus("synced");
      }
    } catch (err) {
      console.error("Sync to Supabase error:", err);
      setSyncStatus("error");
    }
  }, [user]);

  // Profile operations
  const updateProfile = useCallback((profileUpdates) => {
    setPatientData(prev => {
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
    const localized = localizeConditionAnatomically(condition);
    const hasExplicitCoords = condition.coords && (condition.coords.x !== 0 || condition.coords.y !== 0);
    const newCond = {
      ...localized,
      ...condition,
      id: condition.id || `cond-${Date.now()}`,
      coords: hasExplicitCoords ? condition.coords : localized.coords,
      region: (condition.region && condition.region !== "General") ? condition.region : localized.region,
      system: (condition.system && condition.system !== "general") ? condition.system : localized.system,
      isPosterior: condition.isPosterior ?? localized.isPosterior
    };
    setPatientData(prev => {
      const next = { ...prev, conditions: [newCond, ...prev.conditions] };
      if (user) {
        supabase.from("patient_conditions").insert({
          id: newCond.id,
          user_id: user.id,
          name: newCond.name,
          region: newCond.region || "General",
          icd10: newCond.icd10 || null,
          onset_date: newCond.onsetDate || newCond.onset_date || null,
          status: newCond.status || "Active",
          provider: newCond.provider || null,
          coords: newCond.coords || { x: 0, y: 3.5, z: 1.0 },
          system: newCond.system || "general",
          notes: newCond.notes || null
        }).then(({ error }) => {
          if (error) {
            console.error("Failed to insert condition into Supabase:", error);
            setSyncStatus("error");
          } else {
            setSyncStatus("synced");
          }
        });
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
        const dbUpdates = { ...updates };
        if (updates.onsetDate) dbUpdates.onset_date = updates.onsetDate;
        delete dbUpdates.onsetDate;

        supabase.from("patient_conditions").update(dbUpdates).eq("id", id).eq("user_id", user.id).then(({ error }) => {
          if (error) console.error("Update condition error:", error);
        });
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
        supabase.from("patient_conditions").delete().eq("id", id).eq("user_id", user.id).then(({ error }) => {
          if (error) console.error("Delete condition error:", error);
        });
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
          site: newSurg.site || "General",
          surgery_date: newSurg.surgeryDate || newSurg.surgery_date || null,
          hospital: newSurg.hospital || null,
          surgeon: newSurg.surgeon || null,
          incision: newSurg.incision || null,
          coords: newSurg.coords || { x: 0, y: 3.0, z: 1.0 },
          system: newSurg.system || "general",
          notes: newSurg.notes || null
        }).then(({ error }) => {
          if (error) {
            console.error("Failed to insert surgery into Supabase:", error);
            setSyncStatus("error");
          } else {
            setSyncStatus("synced");
          }
        });
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
        const dbUpdates = { ...updates };
        if (updates.surgeryDate) dbUpdates.surgery_date = updates.surgeryDate;
        delete dbUpdates.surgeryDate;

        supabase.from("patient_surgeries").update(dbUpdates).eq("id", id).eq("user_id", user.id).then(({ error }) => {
          if (error) console.error("Update surgery error:", error);
        });
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
        supabase.from("patient_surgeries").delete().eq("id", id).eq("user_id", user.id).then(({ error }) => {
          if (error) console.error("Delete surgery error:", error);
        });
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
          dosage: newMed.dosage || "Standard Dose",
          route: newMed.route || "Oral (PO)",
          frequency: newMed.frequency || "Once Daily",
          indication: newMed.indication || null,
          start_date: newMed.startDate || newMed.start_date || null,
          prescriber: newMed.prescriber || null,
          system: newMed.system || "general",
          notes: newMed.notes || null
        }).then(({ error }) => {
          if (error) {
            console.error("Failed to insert medication into Supabase:", error);
            setSyncStatus("error");
          } else {
            setSyncStatus("synced");
          }
        });
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
        const dbUpdates = { ...updates };
        if (updates.startDate) dbUpdates.start_date = updates.startDate;
        delete dbUpdates.startDate;

        supabase.from("patient_medications").update(dbUpdates).eq("id", id).eq("user_id", user.id).then(({ error }) => {
          if (error) console.error("Update medication error:", error);
        });
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
        supabase.from("patient_medications").delete().eq("id", id).eq("user_id", user.id).then(({ error }) => {
          if (error) console.error("Delete medication error:", error);
        });
      }
      return next;
    });
  }, [user]);

  // Drain CRUD (in-memory & scoped)
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

  // Line CRUD (in-memory & scoped)
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
      name: procedure.procedure_name || procedure.name || "Diagnostic Procedure",
      procedure_type: procedure.procedure_type || procedure.procedureType || "diagnostic",
      date_performed: procedure.date_performed || procedure.datePerformed || new Date().toISOString().split("T")[0],
      datePerformed: procedure.date_performed || procedure.datePerformed || new Date().toISOString().split("T")[0],
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
          recall_interval_years: newProc.recall_interval_years,
          coords: newProc.coords,
          system: newProc.system
        }).then(({ error }) => {
          if (error) console.error("Insert procedure error:", error);
        });
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

        supabase.from("patient_procedures").update(dbUpdates).eq("id", id).eq("user_id", user.id).then(({ error }) => {
          if (error) console.error("Update procedure error:", error);
        });
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
        supabase.from("patient_procedures").delete().eq("id", id).eq("user_id", user.id).then(({ error }) => {
          if (error) console.error("Delete procedure error:", error);
        });
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
      name: vaccine.vaccine_name || vaccine.name || "Immunization",
      date_administered: vaccine.date_administered || vaccine.dateAdministered || new Date().toISOString().split("T")[0],
      dateAdministered: vaccine.date_administered || vaccine.dateAdministered || new Date().toISOString().split("T")[0],
      dose_number: Number(vaccine.dose_number || vaccine.doseNumber || 1),
      doseNumber: Number(vaccine.dose_number || vaccine.doseNumber || 1),
      administering_facility: vaccine.administering_facility || vaccine.administeringFacility || "",
      lot_number: vaccine.lot_number || vaccine.lotNumber || null,
      next_due_date: vaccine.next_due_date || vaccine.nextDueDate || null,
      nextDueDate: vaccine.next_due_date || vaccine.nextDueDate || null
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
          lot_number: newVax.lot_number,
          next_due_date: newVax.next_due_date
        }).then(({ error }) => {
          if (error) console.error("Insert vaccine error:", error);
        });
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
        if (updates.lotNumber !== undefined || updates.lot_number !== undefined) {
          dbUpdates.lot_number = updates.lotNumber || updates.lot_number || null;
        }
        if (updates.nextDueDate !== undefined) dbUpdates.next_due_date = updates.nextDueDate;

        supabase.from("patient_vaccinations").update(dbUpdates).eq("id", id).eq("user_id", user.id).then(({ error }) => {
          if (error) console.error("Update vaccine error:", error);
        });
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
        supabase.from("patient_vaccinations").delete().eq("id", id).eq("user_id", user.id).then(({ error }) => {
          if (error) console.error("Delete vaccine error:", error);
        });
      }
      return next;
    });
  }, [user]);

  // Batch commit onboarding data (from Intake Wizard or PDF Import)
  const batchCommitOnboardingData = useCallback(async (payload) => {
    if (!payload) return;

    if (!user) {
      // DEMO PATIENT / EXPLORATION MODE (Unauthenticated):
      // Retain ALL prior information (conditions, surgeries, medications, drains, lines, procedures, vaccines)
      // and append / merge any new additions in-memory without overwriting the baseline.
      const existingConds = patientData.conditions || [];
      const incomingConds = payload.conditions || [];
      const mergedConds = [
        ...existingConds,
        ...incomingConds.filter(nc => !existingConds.some(ec => ec.id === nc.id || (nc.name && ec.name && nc.name.toLowerCase() === ec.name.toLowerCase())))
      ];

      const existingSurgs = patientData.surgeries || [];
      const incomingSurgs = payload.surgeries || [];
      const mergedSurgs = [
        ...existingSurgs,
        ...incomingSurgs.filter(ns => !existingSurgs.some(es => es.id === ns.id || (ns.name && es.name && ns.name.toLowerCase() === es.name.toLowerCase())))
      ];

      const existingMeds = patientData.medications || [];
      const incomingMeds = payload.medications || [];
      const mergedMeds = [
        ...existingMeds,
        ...incomingMeds.filter(nm => !existingMeds.some(em => em.id === nm.id || (nm.name && em.name && nm.name.toLowerCase() === em.name.toLowerCase())))
      ];

      const existingProcs = patientData.procedures || [];
      const incomingProcs = payload.procedures || [];
      const mergedProcs = [
        ...existingProcs,
        ...incomingProcs.filter(np => !existingProcs.some(ep => ep.id === np.id || ((np.procedure_name || np.name) && (ep.procedure_name || ep.name) && (np.procedure_name || np.name).toLowerCase() === (ep.procedure_name || ep.name).toLowerCase())))
      ];

      const existingVax = patientData.vaccinations || [];
      const incomingVax = payload.vaccinations || [];
      const mergedVax = [
        ...existingVax,
        ...incomingVax.filter(nv => !existingVax.some(ev => ev.id === nv.id || ((nv.vaccine_name || nv.name) && (ev.vaccine_name || ev.name) && (nv.vaccine_name || nv.name).toLowerCase() === (ev.vaccine_name || ev.name).toLowerCase())))
      ];

      const existingAllergies = patientData.allergiesList || [];
      const incomingAllergies = payload.allergiesList || [];
      const mergedAllergies = [
        ...existingAllergies,
        ...incomingAllergies.filter(na => !existingAllergies.some(ea => ea.id === na.id || (na.medication && ea.medication && na.medication.toLowerCase() === ea.medication.toLowerCase())))
      ];

      const updated = {
        ...patientData,
        profile: {
          ...patientData.profile,
          ...(payload.profile?.name && payload.profile.name !== "Elena Vance" ? payload.profile : {})
        },
        allergiesList: mergedAllergies,
        conditions: mergedConds,
        surgeries: mergedSurgs,
        medications: mergedMeds,
        procedures: mergedProcs,
        vaccinations: mergedVax,
        drains: patientData.drains || [],
        lines: patientData.lines || []
      };

      setPatientData(updated);
      setIsNewPatient(false);
      return;
    }

    const newAllergiesList = payload.allergiesList !== undefined
      ? payload.allergiesList
      : (patientData.allergiesList || []);

    let allergiesSummary = payload.profile?.allergies || patientData.profile.allergies;
    if (newAllergiesList.length > 0) {
      allergiesSummary = newAllergiesList.map(a => `${a.medication || a.drugName}${a.reaction ? ` (${a.reaction})` : ""}`).join(", ");
    } else if (payload.isNkda || (!allergiesSummary && newAllergiesList.length === 0)) {
      allergiesSummary = "No Known Drug Allergies (NKDA)";
    }

    const updatedProfile = {
      ...patientData.profile,
      ...(payload.profile || {}),
      allergies: allergiesSummary
    };

    const newConditions = payload.conditions !== undefined ? payload.conditions : [];
    const newSurgeries = payload.surgeries !== undefined ? payload.surgeries : [];
    const newMedications = payload.medications !== undefined ? payload.medications : [];
    const newProcedures = payload.procedures !== undefined ? payload.procedures : [];
    const newVaccinations = payload.vaccinations !== undefined ? payload.vaccinations : [];

    const updated = {
      ...patientData,
      profile: updatedProfile,
      allergiesList: newAllergiesList,
      conditions: newConditions,
      surgeries: newSurgeries,
      medications: newMedications,
      procedures: newProcedures,
      vaccinations: newVaccinations
    };

    setPatientData(updated);
    setIsNewPatient(false);

    if (user?.id) {
      try {
        localStorage.setItem(getUserStorageKey(user.id), JSON.stringify(updated));
      } catch (_) {}
    }

    if (user) {
      setSyncStatus("syncing");
      try {
        const ecName = updatedProfile.emergencyContactName || [updatedProfile.emergencyContactFirstName, updatedProfile.emergencyContactLastName].filter(Boolean).join(" ");
        await supabase.from("patient_profile").upsert({
          user_id: user.id,
          name: updatedProfile.name || "Patient",
          dob: updatedProfile.dob || null,
          age: updatedProfile.age ? Number(updatedProfile.age) : null,
          sex: updatedProfile.sex || "female",
          build: updatedProfile.build || "medium",
          skin_tone: updatedProfile.skinTone || "#d4a373",
          mrn: updatedProfile.mrn || null,
          phone: updatedProfile.phone || null,
          email: updatedProfile.email || null,
          address: updatedProfile.address || null,
          veteran_status: updatedProfile.veteranStatus || "No",
          preferred_language: updatedProfile.preferredLanguage || "English",
          blood_type: updatedProfile.bloodType || null,
          pcp: updatedProfile.pcp || null,
          pcp_phone: updatedProfile.pcpPhone || null,
          clinic: updatedProfile.clinic || null,
          emergency_contact: updatedProfile.emergencyContact || null,
          emergency_contact_first_name: updatedProfile.emergencyContactFirstName || null,
          emergency_contact_last_name: updatedProfile.emergencyContactLastName || null,
          emergency_contact_name: ecName || null,
          emergency_contact_relation: updatedProfile.emergencyContactRelation || null,
          emergency_contact_phone: updatedProfile.emergencyContactPhone || null,
          allergies: updatedProfile.allergies || null,
          pharmacy: updatedProfile.pharmacy || null,
          updated_at: new Date().toISOString()
        }, { onConflict: "user_id" });

        // Clean previous records for this user to ensure only committed data exists
        await Promise.allSettled([
          supabase.from("patient_conditions").delete().eq("user_id", user.id),
          supabase.from("patient_surgeries").delete().eq("user_id", user.id),
          supabase.from("patient_medications").delete().eq("user_id", user.id),
          supabase.from("patient_procedures").delete().eq("user_id", user.id),
          supabase.from("patient_vaccinations").delete().eq("user_id", user.id)
        ]);

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
            facility: c.facility || null,
            laterality: c.laterality || null,
            coords: c.coords || { x: 0, y: 3.5, z: 1.0 },
            system: c.system || "general",
            notes: c.notes || null
          }));
          await supabase.from("patient_conditions").insert(rows);
        }

        if (newSurgeries.length > 0) {
          const rows = newSurgeries.map(s => {
            let coords = s.coords || { x: 0, y: 3.0, z: 1.0 };
            if (s.laterality === "Right" && coords.x > 0) {
              coords = { ...coords, x: -Math.abs(coords.x) };
            } else if (s.laterality === "Left" && coords.x < 0) {
              coords = { ...coords, x: Math.abs(coords.x) };
            }

            let notes = s.notes || "";
            const extras = [];
            if (s.laterality) extras.push(`Laterality: ${s.laterality}`);
            if (s.approach) extras.push(`Approach: ${s.approach}`);
            if (s.hardwareNotes) extras.push(`Hardware: ${s.hardwareNotes}`);
            if (extras.length > 0) {
              notes = notes ? `${notes} • ${extras.join(" | ")}` : extras.join(" | ");
            }

            return {
              id: s.id || `surg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              user_id: user.id,
              name: s.name,
              site: s.site || "General",
              surgery_date: s.surgeryDate || s.surgery_date || null,
              hospital: s.hospital || null,
              surgeon: s.surgeon || null,
              incision: s.incision || null,
              coords,
              system: s.system || "general",
              notes: notes || null
            };
          });
          await supabase.from("patient_surgeries").insert(rows);
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
            facility: m.facility || null,
            days_supply: m.daysSupply !== undefined && m.daysSupply !== "" ? Number(m.daysSupply) : (m.days_supply !== undefined && m.days_supply !== "" ? Number(m.days_supply) : null),
            last_picked_up_date: m.lastPickedUpDate || m.last_picked_up_date || null,
            last_picked_up_pharmacy: m.lastPickedUpPharmacy || m.last_picked_up_pharmacy || null,
            quantity_amount: m.quantityAmount || m.quantity_amount || null,
            refills_remaining: m.refillsRemaining !== undefined && m.refillsRemaining !== "" ? Number(m.refillsRemaining) : (m.refills_remaining !== undefined && m.refills_remaining !== "" ? Number(m.refills_remaining) : null),
            rx_number: m.rxNumber || m.rx_number || null,
            system: m.system || "general",
            notes: m.notes || null
          }));
          await supabase.from("patient_medications").insert(rows);
        }

        if (newProcedures.length > 0) {
          const rows = newProcedures.map(p => ({
            id: p.id || `proc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            user_id: user.id,
            procedure_name: p.procedure_name || p.name,
            procedure_type: p.procedure_type || p.procedureType || "diagnostic",
            date_performed: p.date_performed || p.datePerformed || null,
            anatomical_marker: p.anatomical_marker || p.anatomicalMarker || "General",
            performing_clinician: p.performing_clinician || p.performingClinician || p.physician || null,
            institution: p.institution || p.facility || null,
            findings: p.findings || null,
            recall_interval_years: p.recall_interval_years ? Number(p.recall_interval_years) : (p.recallYears ? Number(p.recallYears) : null),
            coords: p.coords || { x: 0.1, y: 1.8, z: 1.05 },
            system: p.system || "general"
          }));
          await supabase.from("patient_procedures").insert(rows);
        }

        if (newVaccinations.length > 0) {
          const rows = newVaccinations.map(v => ({
            id: v.id || `vax-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            user_id: user.id,
            vaccine_name: v.vaccine_name || v.name,
            date_administered: v.date_administered || v.dateAdministered || null,
            dose_number: v.dose_number ? Number(v.dose_number) : 1,
            administering_facility: v.administering_facility || v.administeringFacility || v.clinic || null,
            lot_number: v.lot_number || v.lotNumber || null,
            next_due_date: v.next_due_date || v.nextDueDate || null
          }));
          await supabase.from("patient_vaccinations").insert(rows);
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
    if (user?.id) {
      const blank = createDefaultBlankPatient(user);
      setPatientData(blank);
      try {
        localStorage.setItem(getUserStorageKey(user.id), JSON.stringify(blank));
      } catch (_) {}
    } else {
      const defaultData = JSON.parse(JSON.stringify(DEFAULT_PATIENT_RECORD));
      setPatientData(defaultData);
      try {
        localStorage.removeItem(GUEST_STORAGE_KEY);
      } catch (_) {}
    }
    setIsNewPatient(false);
  }, [user]);

  // Explicitly load the complete Elena Vance interactive clinical demo
  const loadDemoData = useCallback(() => {
    const defaultData = JSON.parse(JSON.stringify(DEFAULT_PATIENT_RECORD));
    setPatientData(defaultData);
    setIsNewPatient(false);
    try {
      localStorage.removeItem(GUEST_STORAGE_KEY);
      localStorage.setItem("pmhx_demo_mode", "true");
    } catch (_) {}
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
    resetToDefault,
    loadDemoData
  };
}
