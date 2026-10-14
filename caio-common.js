/* CAIO shared helpers: who is logged in, audit log, grades, shared groups.
   Loaded by student_edit.html, student_delete.html, dashboard.html, ... */
(function(){
  const GRADES = {
    first_prep:       { ar:"الصف الأول الإعدادي",  att:"حضور_أولى_إعدادي", pay:"دفع_أولى_إعدادي", scanner:"prep1",  reg:"First Prep"   },
    second_prep:      { ar:"الصف الثاني الإعدادي", att:"حضور_تانية_إعدادي", pay:"دفع_تانية_إعدادي", scanner:"prep2",  reg:"Second Prep"  },
    third_prep:       { ar:"الصف الثالث الإعدادي", att:"حضور_تالتة_إعدادي", pay:"دفع_تالتة_إعدادي", scanner:"prep3",  reg:"Third Prep"   },
    first_secondary:  { ar:"الصف الأول الثانوي",   att:"حضور_أولى_ثانوي",   pay:"دفع_أولى_ثانوي",   scanner:"first",  reg:"First Grade"  },
    second_secondary: { ar:"الصف الثاني الثانوي",  att:"حضور_تانية_ثانوي",  pay:"دفع_تانية_ثانوي",  scanner:"second", reg:"Second Grade" },
    third_secondary:  { ar:"الصف الثالث الثانوي",  att:"حضور_تالتة_ثانوي",  pay:"دفع_تالتة_ثانوي",  scanner:"third",  reg:"Third Grade"  }
  };

  // The 8 original groups keep the exact id the scanner / DB functions know.
  const LEGACY = {
    "prep1-sattue-3": {id:"سبت وثلاث 3",        dayAr:"سبت وتلات", time:"3:00"},
    "prep2-sattue-4": {id:"سبت وثلاث 4",        dayAr:"سبت وتلات", time:"4:00"},
    "prep3-sattue-2": {id:"سبت وثلاث 2",        dayAr:"سبت وتلات", time:"2:00"},
    "sec1-sunwed-2":  {id:"الأحد والأربعاء 2",  dayAr:"حد واربع",  time:"2:00"},
    "sec2-sunwed-3":  {id:"الأحد والأربعاء 3",  dayAr:"حد واربع",  time:"3:00"},
    "sec2-sunwed-6":  {id:"الأحد والأربعاء 6",  dayAr:"حد واربع",  time:"6:00"},
    "sec3-sunwed-12": {id:"الأحد والأربعاء 12", dayAr:"حد واربع",  time:"12:00"},
    "sec3-sunwed-5":  {id:"الأحد والأربعاء 5",  dayAr:"حد واربع",  time:"5:00"}
  };
  const DEFAULT_GROUPS = {
    first_prep:["prep1-sattue-3"], second_prep:["prep2-sattue-4"], third_prep:["prep3-sattue-2"],
    first_secondary:["sec1-sunwed-2"], second_secondary:["sec2-sunwed-3","sec2-sunwed-6"],
    third_secondary:["sec3-sunwed-12","sec3-sunwed-5"]
  };

  function teacherOk(){
    try{
      const raw = sessionStorage.getItem('caioTeacherSession') || localStorage.getItem('caioTeacherSession');
      if(!raw) return false;
      const d = JSON.parse(raw);
      return !!(d && d.exp && Date.now() < d.exp);
    }catch(e){ return false; }
  }

  window.CAIO = {
    GRADES,
    teacherOk,
    actor(){
      return teacherOk() ? { role:'teacher', name:'المدرس' } : { role:'assistant', name:'المساعد' };
    },
    /* Fire-and-forget audit entry. Never throws, never blocks the real action. */
    async audit(supa, entry){
      try{
        const a = this.actor();
        const { error } = await supa.from('audit_log').insert({
          actor_role: a.role, actor: a.name,
          action: entry.action, grade: entry.grade || null,
          student_name: entry.student_name || null, qr_code: entry.qr_code || null,
          details: entry.details || null
        });
        if(error) console.warn('audit_log insert failed', error.message);
      }catch(e){ console.warn('audit_log insert failed', e); }
    },
    /* Groups per grade key (first_prep, ...) from the registration admin
       config (Supabase app_config). Falls back to the 8 built-in groups. */
    async loadGroups(supa){
      const out = {};
      Object.keys(GRADES).forEach(k => out[k] = []);
      let cfg = null;
      try{
        const { data } = await supa.from('app_config').select('value').eq('key','reg_form_data').maybeSingle();
        if(data && data.value && Array.isArray(data.value.stages)) cfg = data.value;
      }catch(e){}
      if(cfg){
        const byReg = {};
        Object.entries(GRADES).forEach(([k,g]) => byReg[g.reg] = k);
        cfg.stages.forEach(st => (st.grades||[]).forEach(gr => {
          const key = byReg[gr.value]; if(!key) return;
          (gr.groups||[]).forEach(g => {
            const time = String(g.time||''); const short = time.replace(':00','');
            const l = LEGACY[g.value];
            const id = (l && l.dayAr === g.dayAr && l.time === time) ? l.id : `${g.dayAr} ${short}`;
            out[key].push({ id, label:`${g.dayAr} - الساعة ${short}` });
          });
        }));
      } else {
        Object.entries(DEFAULT_GROUPS).forEach(([k,vals]) => vals.forEach(v => {
          const l = LEGACY[v]; out[k].push({ id:l.id, label:`${l.dayAr} - الساعة ${l.time.replace(':00','')}` });
        }));
      }
      return out;
    }
  };
})();
