import React, { useState, useEffect, useRef, useCallback } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend
} from "recharts";
import { supabase } from "../lib/supabase";
import {
  getProfile, upsertProfile,
  getFoodLog, upsertFoodEntry, deleteFoodEntry,
  getFavorites, upsertFavorite, deleteFavorite,
  getBodyMeasurements, insertBodyMeasurement, insertBodyMeasurementsBatch,
  getLabResults, insertLabResult, insertLabResultsBatch,
  getAiCache, setAiCache,
  getBodyPhotos, insertBodyPhoto, deleteBodyPhoto,
} from "../lib/db";

const TARGETS_DEF = { calories: 2300, protein: 165, carbs: 215, fats: 62 };
const INITIAL_FAVS = [
  {id:1772645449956,name:"Overnight Oats con Chía, Proteína, Almendras y Arándanos",calories:380,protein:28,carbs:42,fats:12,grade:"A",score:9,meal:"Snack Mañana",dayType:"entreno",ldl_impact:"positivo",hba1c_impact:"positivo",notes:"Excelente pre-entreno: fibra, proteína, grasas saludables. Almendras y chía bajan LDL"},
];

const SEED_INBODY = [
  {d:"2018-08-01",w:69.3,m:55.1,f:16.4,s:null,vi:4,whr:0.85,note:"Baseline"},
  {d:"2019-04-01",w:68.0,m:32.2,f:16.1,s:80,vi:4,whr:0.84,note:""},
  {d:"2019-05-01",w:68.1,m:32.2,f:16.3,s:79,vi:4,whr:0.85,note:""},
  {d:"2019-07-01",w:70.9,m:34.5,f:14.4,s:null,vi:4,whr:0.84,note:""},
  {d:"2019-08-01",w:70.1,m:33.6,f:15.6,s:82,vi:4,whr:0.83,note:""},
  {d:"2019-10-01",w:70.6,m:34.0,f:15.7,s:82,vi:4,whr:0.86,note:""},
  {d:"2019-11-01",w:70.2,m:33.4,f:16.3,s:81,vi:4,whr:0.85,note:""},
  {d:"2019-12-01",w:70.3,m:32.9,f:17.6,s:79,vi:4,whr:0.86,note:""},
  {d:"2020-01-01",w:70.9,m:34.7,f:14.0,s:83,vi:4,whr:0.86,note:"Min grasa ★"},
  {d:"2020-02-01",w:71.5,m:34.7,f:14.9,s:82,vi:4,whr:0.87,note:""},
  {d:"2021-01-01",w:72.0,m:34.6,f:15.3,s:82,vi:4,whr:0.86,note:""},
  {d:"2021-04-01",w:73.5,m:35.4,f:15.6,s:82,vi:4,whr:0.87,note:""},
  {d:"2021-07-01",w:74.8,m:36.6,f:14.6,s:85,vi:4,whr:0.90,note:""},
  {d:"2022-09-01",w:78.2,m:38.5,f:14.3,s:88,vi:4,whr:0.84,note:"Récord músculo ★"},
  {d:"2025-01-01",w:83.4,m:38.5,f:19.3,s:null,vi:7,whr:0.93,note:""},
  {d:"2025-03-01",w:83.7,m:39.0,f:18.9,s:null,vi:6,whr:0.94,note:""},
  {d:"2025-05-01",w:82.8,m:38.4,f:19.4,s:null,vi:6,whr:0.94,note:""},
  {d:"2025-11-01",w:83.7,m:38.2,f:20.6,s:null,vi:6,whr:0.93,note:"Peor grasa"},
  {d:"2026-02-01",w:82.8,m:38.5,f:19.0,s:null,vi:6,whr:0.93,note:"HOY ◀"},
];

const SEED_LABS = [
  {date:"Ago 2025",ldl:224.2,hdl:65.8,tc:318,tg:140,hba1c:5.80,glucose:93.5,psa:null,vcm:72.5,hcm:24.5,hb:13.8,leucocitos:4.82,linfocitos:44.8},
  {date:"Nov 2025",ldl:139.4,hdl:60.0,tc:235,tg:178,hba1c:null,glucose:null,psa:1.1,vcm:75.7,hcm:25.3,hb:15.1,leucocitos:6.62,linfocitos:45.2},
  {date:"Feb 2026",ldl:124.4,hdl:61.0,tc:208,tg:113,hba1c:5.90,glucose:97.0,psa:null,vcm:null,hcm:null,hb:null,leucocitos:null,linfocitos:null},
];

const TRAINING_WEEK = [
  {day:"LUN",type:"PUSH A",color:"#4dc8ff",ex:[
    ["Fondos barras (chaleco)","4×6-10"],["Press suelo DB 30lbs","4×10-12"],
    ["Press militar KB","3×10-12"],["Aperturas suelo DB","3×12-15"],
    ["Elev. laterales ligas","3×15-20"],["Tríceps overhead KB","3×12"],
  ]},
  {day:"MAR",type:"PULL A",color:"#3ddc84",ex:[
    ["Dominadas pronado (chaleco)","4×6-10"],["Remo invertido (chaleco)","4×10-12"],
    ["Remo DB unilateral 30lb","4×10-12"],["Face pull ligas","4×15-20"],
    ["Curl supino DB","3×12-15"],["Curl martillo DB","3×12"],
  ]},
  {day:"MIÉ",type:"LEGS A",color:"#ffb830",ex:[
    ["Goblet squat KB","4×10-12"],["Zancadas DB (30+10)","4×10/leg"],
    ["Peso muerto rumano KB","4×10-12"],["Hip thrust suelo KB","3×12-15"],
    ["Curl femoral ligas","3×15/leg"],["Elev. talones (chaleco)","4×20-25"],
  ]},
  {day:"JUE",type:"DESCANSO",color:null,rest:true,ex:[]},
  {day:"VIE",type:"PUSH B",color:"#4dc8ff",ex:[
    ["Push-ups chaleco (ancha)","4×10-15"],["HSPU prog. pared","4×5-8"],
    ["Press Arnold DB 25lb","3×10-12"],["Dips paralelas (chaleco)","3×8-12"],
    ["Elev. frontales DB","3×12"],["Tríceps kickback ligas","3×15"],
  ]},
  {day:"SÁB",type:"METCON",color:"#a8ff3e",ex:[
    ["Cuerda dobles","10 min"],["Muscle-ups (excéntrica)","4×3-5"],
    ["Pistol squats","5×5/leg"],["EMOM 20 min","KB+cuerda"],
    ["Toes to bar","4×10-15"],["Dragon flag / Windshield","3×8"],
  ]},
  {day:"DOM",type:"DESCANSO",color:null,rest:true,ex:[]},
];

const INSIGHTS = [
  {lvl:"r",icon:"🔴",title:"LDL 124 mg/dL — Meta <100",txt:"Reducción extraordinaria 318→208 mg/dL en 6 meses con rosuvastatina. Aún 24 mg/dL sobre objetivo. Mantener avena diaria, aguacate, salmón 3x/sem, legumbres 4x/sem. Evaluar con médico ajuste de dosis o ezetimiba."},
  {lvl:"y",icon:"🟡",title:"HbA1c 5.90% — Zona de riesgo aumentado",txt:"Dos mediciones consecutivas sobre 5.70%. Caminar 15-20 min post-almuerzo todos los días. Eliminar harinas blancas y azúcares simples. Repetir HbA1c en mayo 2026. Si llega a 6.0%, manejo médico inmediato."},
  {lvl:"y",icon:"🟡",title:"Microcitosis persistente VCM 72-75 fL",txt:"Hemoglobina mejoró 13.8→15.1 g/dL (positivo, descarta anemia activa). Pedir ferritina+hierro sérico+TIBC en próximo panel para descartar déficit subclínico o talasemia minor."},
  {lvl:"y",icon:"🟡",title:"Grasa troncal al 203% del normal",txt:"8.8 kg de grasa en tronco (203% del rango normal). Razón principal del WHR 0.93. La reducción de grasa troncal mejorará directamente HbA1c, sensibilidad insulínica y definición visual."},
  {lvl:"g",icon:"✅",title:"Recomposición corporal Nov→Feb 2026",txt:"En 3 meses: peso −0.9 kg (83.7→82.8), grasa −1.6% (20.6→19.0%), músculo +0.3 kg (38.2→38.5). Perder grasa mientras se gana músculo simultáneamente confirma que el protocolo funciona perfectamente."},
  {lvl:"g",icon:"✅",title:"Reducción de colesterol extraordinaria",txt:"−110 mg/dL de colesterol total en 6 meses (318→208). Ratio Col/HDL: 4.8→3.4 (meta <4.6 ✓). HDL estable 61–65 mg/dL. TG: 178→113 mg/dL."},
  {lvl:"g",icon:"✅",title:"Masa muscular élite a los 39 años",txt:"38.5 kg SMM = percentil 95%+ de la población masculina de su edad. Brazos al 121% del normal, tronco al 110%. La base muscular de +6.3 kg desde 2019 es el cimiento para la definición 2026."},
];

const PLAN_MEALS = [
  {name:"Desayuno",time:"6:30–7:30 AM",kcal:520,p:38,c:60,f:16,items:[
    {n:"Avena en hojuelas 80g",why:"Beta-glucano = 'estatina vegetal' · Baja LDL 5–10%"},
    {n:"Linaza molida 15g",why:"ALA omega-3 + lignanos → LDL e insulina"},
    {n:"2 huevos + 3 claras",why:"26g proteína completa de alta biodisponibilidad"},
    {n:"Manzana/pera con cáscara",why:"Pectina = fibra soluble extra · Bajo IG"},
  ]},
  {name:"Snack Mañana",time:"10:00–10:30 AM",kcal:280,p:25,c:12,f:14,items:[
    {n:"Yogur griego natural 200g",why:"Proteína + probióticos → mejor perfil lipídico"},
    {n:"Nueces 20g o almendras 25g",why:"Grasa monoinsaturada → sube HDL · Saciedad"},
  ]},
  {name:"Almuerzo ⭐",time:"12:30–1:30 PM · Caminar 15-20 min después",kcal:680,p:45,c:65,f:20,highlight:true,items:[
    {n:"Proteína 150-180g (salmón/tilapia/pechuga)",why:"Salmón 3x/sem = EPA/DHA → TG −30%"},
    {n:"Carbohidrato base bajo IG (arroz integral/quinoa/camote/frijoles)",why:"Legumbres 4x/sem = fibra + fitosteroles → LDL"},
    {n:"Vegetales abundantes 300g",why:"Fibra insoluble + antioxidantes → reducen oxidación LDL"},
    {n:"AOVE 1 cda + ½ aguacate",why:"Fitosteroles del aguacate bloquean absorción intestinal de LDL"},
  ]},
  {name:"Post-Entreno ⚡",time:"Dentro de 45 min",kcal:380,p:33,c:31,f:3,items:[
    {n:"Whey isolate 30g + Creatina 5g",why:"Leucina activa síntesis proteica · Carbos mejoran captación creatina"},
    {n:"Banana o 40g avena",why:"Repone glucógeno · Potasio para recuperación"},
  ]},
  {name:"Cena",time:"7:00–8:00 PM",kcal:490,p:42,c:30,f:16,items:[
    {n:"Proteína magra 120-150g (atún/claras/pechuga)",why:"Alto en proteína, bajo en grasas saturadas"},
    {n:"Verduras salteadas o ensalada abundante",why:"Fibra + micronutrientes · Bajo IG nocturno"},
    {n:"Carbohidrato bajo-IG 40g cocido (opcional)",why:"Solo en días de entreno intenso"},
  ]},
];

const HABITS = [
  {icon:"🚶",title:"Caminar 15-20 min post-almuerzo",desc:"Reduce pico glucémico hasta un 30%. El impacto más alto en HbA1c después de la dieta.",badges:["#a8ff3e","HbA1c","#3ddc84","Glucosa"]},
  {icon:"💊",title:"Rosuvastatina con la cena",desc:"La síntesis de colesterol es máxima en la noche. Tomarla en la cena maximiza el efecto de la estatina.",badges:["#4dc8ff","LDL","#a8ff3e","Timing óptimo"]},
  {icon:"🐟",title:"Salmón 3x por semana",desc:"EPA/DHA reducen triglicéridos hasta un 30%. Alternativas: atún en agua, caballa, sardinas.",badges:["#4dc8ff","TG −30%","#3ddc84","Omega-3"]},
  {icon:"🥑",title:"Aguacate + avena diarios",desc:"Fitosteroles del aguacate bloquean absorción intestinal de LDL. Beta-glucanos de avena = estatina vegetal.",badges:["#a8ff3e","LDL directo","#3ddc84","Fibra soluble"]},
  {icon:"🌙",title:"Magnesio 400mg antes de dormir",desc:"Mejora calidad del sueño y recuperación muscular. Forma glicinato = máxima absorción y sin efecto laxante.",badges:["#4dc8ff","Sueño","#ffb830","Recuperación"]},
  {icon:"📅",title:"Check InBody cada 6-8 semanas",desc:"Monitorear SMM ≥38.5 kg y % grasa bajando. Meta 2026: 80 kg / 15-16% grasa / score 88.",badges:["#a8ff3e","Recomposición","#4dc8ff","Tracking"]},
];

const INITIAL_LOG = {
  "2026-03-05":[
    {id:1772744305350,name:"Huevos revueltos con jamón de pavo, aguacate y pan de masa madre",calories:420,protein:24,carbs:32,fats:22,grade:"B",meal:"Desayuno",dayType:"entreno",ldl_impact:"positivo",hba1c_impact:"neutro",score:8,notes:"Excelente combinación proteica. Aguacate aporta grasas saludables.",alerta:""},
    {id:1772744342498,name:"Bowl de avena integral con chía, proteína, arándanos",calories:285,protein:18,carbs:38,fats:8,grade:"A",meal:"Desayuno",dayType:"entreno",ldl_impact:"positivo",hba1c_impact:"positivo",score:9,notes:"Avena + chía reducen LDL. Excelente pre-entreno.",alerta:""},
    {id:1772744354944,name:"Bowl de avena integral con chía, leche proteica y arándanos",calories:285,protein:18,carbs:38,fats:8,grade:"A",meal:"Snack Mañana",dayType:"entreno",ldl_impact:"positivo",hba1c_impact:"positivo",score:9,notes:"Fibra soluble de avena y chía reducen LDL.",alerta:""},
    {id:1772744404416,name:"Ensalada con pollo, aguacate, maíz, croutons y pesto",calories:520,protein:32,carbs:38,fats:26,grade:"B",meal:"Almuerzo",dayType:"entreno",ldl_impact:"neutro",hba1c_impact:"positivo",score:8,notes:"Excelente post-entreno. Reduce croutons y aumenta pollo.",alerta:"Controla porción de croutons - carbos refinados"},
  ],
  "2026-03-04":[
    {id:1772643210731,name:"Overnight Oats con Chía, Proteína, Almendras y Arándanos",calories:380,protein:28,carbs:42,fats:12,grade:"A",meal:"Snack Mañana",dayType:"entreno",ldl_impact:"positivo",hba1c_impact:"positivo",score:9,notes:"Excelente pre-entreno: fibra, proteína, grasas saludables. Almendras y chía bajan LDL",alerta:"Perfecto. Opcional: controlar porción plátano si HbA1c sube. Timing ideal pre-entreno"},
    {id:1772645073813,name:"Tostada de masa madre con huevos revueltos, tomate, chile dulce, aguacate, queso pepperjack y jamón de pavo",calories:485,protein:32,carbs:38,fats:22,grade:"B",meal:"Desayuno",dayType:"entreno",ldl_impact:"neutro",hba1c_impact:"positivo",score:8,notes:"Excelente proteína (32g), grasas saludables del aguacate, masa madre bajo IG, ideal pre-entreno",alerta:"Queso pepperjack alto en grasas saturadas (impacta LDL). Considera reducir o cambiar por bajo en grasa"},
    {id:1772654265855,name:"Ensalada de Atún con Aguacate y Frijoles",calories:520,protein:38,carbs:35,fats:24,grade:"B",meal:"Almuerzo",dayType:"entreno",ldl_impact:"positivo",hba1c_impact:"neutro",score:7,notes:"Excelente proteína magra, grasas saludables del aguacate, fibra de vegetales y frijoles",alerta:"Aderezo yogurt-chipotle puede añadir azúcar/grasa. Controlar porción de queso y maíz dulce"},
    {id:1772679845716,name:"Pollo frito caribeño con nuggets y patacones",calories:850,protein:45,carbs:68,fats:42,grade:"D",meal:"Cena",dayType:"entreno",ldl_impact:"negativo",hba1c_impact:"negativo",score:3,notes:"Proteína adecuada post-entreno, pero exceso de frituras y carbohidratos refinados noche",alerta:"Grasas trans/saturadas↑LDL. Carbos altos noche↑HbA1c. Cambiar a pollo asado/plancha"},
    {id:1772680010371,name:"Pan de masa madre con queso fresco",calories:280,protein:14,carbs:38,fats:8,grade:"C",meal:"Merienda",dayType:"descanso",ldl_impact:"neutro",hba1c_impact:"negativo",score:6,notes:"Buena proteína del queso. Masa madre tiene menor índice glucémico que pan común",alerta:"Alto en carbos para día descanso. Con HbA1c 5.9% limitar harinas. Añadir proteína/grasas"},
  ],
  "2026-03-03":[
    {id:1772546897679,name:"Pancakes avena integral, yogurt griego, arándanos",calories:420,protein:28,carbs:52,fats:12,grade:"B",meal:"Desayuno",dayType:"entreno",ldl_impact:"positivo",hba1c_impact:"positivo",score:8,notes:"Avena integral: beta-glucanos reducen LDL. Arándanos cardioprotectores.",alerta:"3 pancakes ~50g carbos: monitorea glucosa post-prandial"},
    {id:1772547911497,name:"Tostada masa madre + jamón de pavo",calories:160,protein:12,carbs:22,fats:3,grade:"C",meal:"Desayuno",dayType:"entreno",ldl_impact:"neutro",hba1c_impact:"neutro",score:6,notes:"Agregar 2 huevos o salmón para llegar a 25-30g proteína.",alerta:"Proteína insuficiente (12g). Falta fibra y grasas saludables."},
    {id:1772558077459,name:"Yogurt griego, granola proteica, almendras, uvas",calories:295,protein:18,carbs:32,fats:10,grade:"B",meal:"Snack Mañana",dayType:"entreno",ldl_impact:"positivo",hba1c_impact:"neutro",score:8,notes:"Almendras: grasas monoinsaturadas favorables para LDL.",alerta:"Controlar granola <35g por porción"},
    {id:1772566500940,name:"Ñoquis, carne molida, salsa tomate, lechugas, AOVE",calories:560,protein:32,carbs:68,fats:18,grade:"C",meal:"Almuerzo",dayType:"entreno",ldl_impact:"neutro",hba1c_impact:"negativo",score:6,notes:"Reemplazar ñoquis por camote para bajar IG.",alerta:"IG alto de ñoquis impacta HbA1c. Fibra insuficiente."},
    {id:1772644547539,name:"Batido Post-Entreno Proteico con Cacao",calories:280,protein:35,carbs:28,fats:4,grade:"A",meal:"Post-Entreno",dayType:"entreno",ldl_impact:"positivo",hba1c_impact:"positivo",score:9,notes:"Excelente timing post-entreno. Alta proteína, carbos moderados del plátano, cacao antioxidante",alerta:"Perfecto. Considera añadir 5g creatina si buscas más rendimiento muscular"},
    {id:1772644611989,name:"Palitos de ajonjolí, pan con mantequilla y galleta suiza",calories:285,protein:7,carbs:35,fats:13,grade:"D",meal:"Merienda",dayType:"entreno",ldl_impact:"negativo",hba1c_impact:"negativo",score:3,notes:"Ajonjolí aporta calcio y grasas saludables",alerta:"Pan blanco+mantequilla elevan glucosa. Cambiar a proteína+fruta pre-entreno"},
    {id:1772644659541,name:"2 Chalupas con Frijol, Pollo, Aguacate y Vegetales",calories:520,protein:32,carbs:48,fats:22,grade:"B",meal:"Cena",dayType:"entreno",ldl_impact:"neutro",hba1c_impact:"neutro",score:7,notes:"Buena proteína del pollo, fibra de frijol/vegetales, grasas saludables del aguacate",alerta:"Carbos moderados-altos para cena. Reducir tortillas o aumentar proteína para recomposición"},
  ],
  "2026-03-02":[
    {id:1772504621489,name:"Gallo pinto, 2 huevos, tortilla, queso",calories:450,protein:22,carbs:48,fats:18,grade:"C",meal:"Desayuno",dayType:"entreno",ldl_impact:"negativo",hba1c_impact:"negativo",score:6,notes:"Reducir arroz a 1/3 taza, agregar aguacate, cocinar con spray.",alerta:"Queso+huevos enteros → LDL. Arroz blanco → HbA1c."},
    {id:1772504692059,name:"Avena integral, leche proteica, chía, melón",calories:270,protein:22,carbs:32,fats:6,grade:"B",meal:"Snack Mañana",dayType:"entreno",ldl_impact:"positivo",hba1c_impact:"positivo",score:8,notes:"Fibra soluble avena+chía puede reducir LDL 5-10%.",alerta:"Consumir 45-60min antes de entrenar"},
    {id:1772504873432,name:"Ensalada, pollo desmechado, falafels, tzatziki, almendras",calories:580,protein:42,carbs:35,fats:28,grade:"B",meal:"Almuerzo",dayType:"entreno",ldl_impact:"negativo",hba1c_impact:"negativo",score:7,notes:"Reducir a 2-3 falafels, eliminar crutones.",alerta:"5 falafels fritos + queso maduro elevan grasas saturadas"},
    {id:1772504964433,name:"Pan ciabatta masa madre, queso blanco, proteína",calories:388,protein:32,carbs:48,fats:8,grade:"C",meal:"Post-Entreno",dayType:"entreno",ldl_impact:"neutro",hba1c_impact:"negativo",score:6,notes:"Sustituir 50% pan por camote asado.",alerta:"48g carbos refinados post-entreno con HbA1c 5.9% es subóptimo"},
    {id:1772505052166,name:"Huevos revueltos, tomate, pavo light, tortilla, queso",calories:330,protein:24,carbs:22,fats:16,grade:"B",meal:"Cena",dayType:"entreno",ldl_impact:"negativo",hba1c_impact:"negativo",score:7,notes:"Usar 1 huevo + 2 claras. Tortilla integral. Agregar espinaca.",alerta:"Queso pepperjack → grasas saturadas impactan LDL"},
  ],
  "2026-03-01":[
    {id:1772505422545,name:"Gallo pinto, 2 huevos revueltos",calories:400,protein:18,carbs:55,fats:12,grade:"C",meal:"Desayuno",dayType:"entreno",ldl_impact:"neutro",hba1c_impact:"negativo",score:6,notes:"Aumentar proteína a 30g. Usar arroz integral. Agregar aguacate.",alerta:"Arroz blanco (55g carbos) impacta HbA1c. Proteína baja."},
    {id:1772505471968,name:"Ensalada, pollo desmechado, tzatziki, pan pita, aguacate",calories:395,protein:38,carbs:28,fats:14,grade:"B",meal:"Almuerzo",dayType:"entreno",ldl_impact:"positivo",hba1c_impact:"positivo",score:8,notes:"Aguacate + fibra = ideal para LDL. Aumentar vegetales.",alerta:"Pan pita → cambiar por integral o más vegetales"},
    {id:1772505316942,name:"Atún, garbanzos, tzatziki, tortilla con queso",calories:490,protein:45,carbs:38,fats:18,grade:"B",meal:"Cena",dayType:"entreno",ldl_impact:"positivo",hba1c_impact:"positivo",score:8,notes:"Atún 3-4x/semana + garbanzos diarios → potente para LDL.",alerta:"Tortilla+queso añade grasas saturadas innecesarias"},
    {id:1772505543747,name:"Batido: proteína, leche, banano, cacao oscuro",calories:310,protein:38,carbs:28,fats:6,grade:"A",meal:"Post-Entreno",dayType:"entreno",ldl_impact:"positivo",hba1c_impact:"positivo",score:9,notes:"Cacao: flavonoides mejoran sensibilidad insulínica. Tomar con creatina.",alerta:"Si el entreno fue muy intenso, agregar fruta adicional"},
  ],
};

// ── HELPERS ──
const todayStr = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const calcMacros = foods => foods.reduce(
  (a,f) => ({calories:a.calories+(f.calories||0),protein:a.protein+(f.protein||0),carbs:a.carbs+(f.carbs||0),fats:a.fats+(f.fats||0)}),
  {calories:0,protein:0,carbs:0,fats:0}
);
const gradeColor = g => {
  if(!g) return "#666";
  const s = g[0].toUpperCase();
  return s==="A"?"#3ddc84":s==="B"?"#a8ff3e":s==="C"?"#ffb830":s==="D"?"#ff7a4d":"#ff4d4d";
};
const impactColor = v => v==="positivo"?"#3ddc84":v==="negativo"?"#ff4d4d":"#8888a8";
const impactArrow = v => v==="positivo"?"↓":v==="negativo"?"↑":"→";
// Image thumbnail cache — only local data (food photos, not synced)
const imgCache = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k,v) => { try { localStorage.setItem(k,v); } catch {} } };

// Robust JSON extractor — handles markdown fences, control chars, trailing commas, truncation
const extractJSON = (raw) => {
  let txt = raw.replace(/```json\s*/gi,"").replace(/```\s*/g,"").trim();
  let start = txt.indexOf("{");
  if (start === -1) throw new Error("No JSON object found");
  // Try to find a complete object first
  let depth = 0, end = -1;
  let inStr = false, escape = false;
  for (let i = start; i < txt.length; i++) {
    const ch = txt[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\" && inStr) { escape = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (depth === 0) { end = i; break; } }
  }
  // If truncated, auto-repair: close open arrays/objects
  let jsonStr;
  if (end === -1) {
    jsonStr = txt.slice(start);
    // Remove control chars
    jsonStr = jsonStr.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g,"");
    // Remove trailing commas
    jsonStr = jsonStr.replace(/,\s*([}\]])/g,"$1");
    // Count open braces and brackets to close them
    let opens = [];
    let inS = false, esc = false;
    for (let i = 0; i < jsonStr.length; i++) {
      const ch = jsonStr[i];
      if (esc) { esc = false; continue; }
      if (ch === "\\" && inS) { esc = true; continue; }
      if (ch === '"') { inS = !inS; continue; }
      if (inS) continue;
      if (ch === "{") opens.push("}");
      else if (ch === "[") opens.push("]");
      else if (ch === "}" || ch === "]") opens.pop();
    }
    // Trim to last complete key-value (cut at last comma or closing)
    const lastClose = Math.max(jsonStr.lastIndexOf("}"), jsonStr.lastIndexOf("]"), jsonStr.lastIndexOf('"'));
    if (lastClose > 0) jsonStr = jsonStr.slice(0, lastClose + 1);
    // Close all open structures
    jsonStr += opens.reverse().join("");
  } else {
    jsonStr = txt.slice(start, end + 1);
    jsonStr = jsonStr.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g,"");
    jsonStr = jsonStr.replace(/,\s*([}\]])/g,"$1");
  }
  return JSON.parse(jsonStr);
};

const MACRO_CFG = {
  calories:{label:"Calorías",unit:"kcal",color:"#ffb830"},
  protein:{label:"Proteína",unit:"g",color:"#4dc8ff"},
  carbs:{label:"Carbs",unit:"g",color:"#a8ff3e"},
  fats:{label:"Grasas",unit:"g",color:"#ff7a4d"},
};
const MACRO_KEYS = ["calories","protein","carbs","fats"];

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Instrument+Sans:ital,wght@0,400;0,500;0,600;1,400&family=JetBrains+Mono:wght@400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
body{background:#0c0c0f;color:#e8e8f0;font-family:'Instrument Sans',sans-serif;font-size:14px;line-height:1.6;}
:root{--bg:#0c0c0f;--s1:#131318;--s2:#1a1a22;--s3:#22222e;--border:#2a2a38;
  --accent:#a8ff3e;--blue:#4dc8ff;--orange:#ff7a4d;--red:#ff4d4d;
  --green:#3ddc84;--yellow:#ffb830;--text:#e8e8f0;--text2:#8888a8;--text3:#44445a;}
.card{background:#131318;border:1px solid #2a2a38;border-radius:4px;padding:18px;}
.lbl{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:#8888a8;margin-bottom:7px;}
.bnum{font-family:'Syne',sans-serif;font-size:48px;font-weight:800;line-height:1;}
.sec-h{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.32em;text-transform:uppercase;color:#a8ff3e;display:flex;align-items:center;gap:14px;margin:24px 0 16px;}
.sec-h::after{content:'';flex:1;height:1px;background:#2a2a38;}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.g7{display:grid;grid-template-columns:repeat(7,1fr);gap:8px;}
.pill{display:inline-flex;align-items:center;gap:4px;font-family:'JetBrains Mono',monospace;font-size:9px;padding:3px 8px;border-radius:2px;}
.tbl{width:100%;border-collapse:collapse;}
.tbl th{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:#8888a8;text-align:left;padding:7px 10px;border-bottom:1px solid #2a2a38;}
.tbl td{padding:7px 10px;font-size:12px;border-bottom:1px solid rgba(42,42,56,.4);}
.tbl tr:last-child td{border-bottom:none;}
.tbl tr:hover td{background:#1a1a22;}
.mono{font-family:'JetBrains Mono',monospace;}
.ins{border-left:3px solid #a8ff3e;background:#1a1a22;border-radius:0 4px 4px 0;padding:14px 17px;margin-bottom:10px;font-size:12px;line-height:1.6;color:#8888a8;}
.ins strong{display:block;font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:#e8e8f0;margin-bottom:5px;}
.ins.ir{border-left-color:#ff4d4d;background:rgba(255,77,77,.04);}
.ins.iy{border-left-color:#ffb830;background:rgba(255,184,48,.04);}
.ins.ig{border-left-color:#3ddc84;background:rgba(61,220,132,.04);}
.ins.ib{border-left-color:#4dc8ff;background:rgba(77,200,255,.04);}
.btn{background:#a8ff3e;color:#0c0c0f;border:none;border-radius:3px;padding:10px 16px;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;font-weight:700;transition:opacity .15s;}
.btn:hover{opacity:.88;}
.btn:disabled{opacity:.4;cursor:default;}
.btn-sm{background:#1a1a22;border:1px solid #2a2a38;color:#8888a8;border-radius:3px;padding:5px 12px;font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;transition:all .2s;}
.btn-sm:hover{color:#e8e8f0;border-color:#44445a;}
.inp{background:#1a1a22;border:1px solid #2a2a38;border-radius:3px;padding:9px 12px;color:#e8e8f0;font-size:13px;font-family:'Instrument Sans',sans-serif;width:100%;transition:border-color .2s;outline:none;}
.inp:focus{border-color:#a8ff3e;}
.inp::placeholder{color:#44445a;}
.photo-zone{border:2px dashed #2a2a38;border-radius:4px;padding:22px 14px;text-align:center;cursor:pointer;transition:all .2s;position:relative;margin-bottom:8px;}
.photo-zone:hover,.photo-zone.drag{border-color:rgba(168,255,62,.5);background:rgba(168,255,62,.04);}
.photo-zone.has-img{border-color:rgba(77,200,255,.4);background:rgba(77,200,255,.04);}
.photo-zone input{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%;}
.photo-zone.upload-zone{border-color:rgba(168,255,62,.3);background:rgba(168,255,62,.02);}
.photo-zone.upload-zone:hover{border-color:rgba(168,255,62,.7);background:rgba(168,255,62,.06);}
.fade-in{animation:fadeIn .25s ease;}
@keyframes fadeIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
.dots span{display:inline-block;width:5px;height:5px;border-radius:50%;background:currentColor;animation:dot .8s ease infinite;margin:0 2px;}
.dots span:nth-child(2){animation-delay:.16s;}
.dots span:nth-child(3){animation-delay:.32s;}
@keyframes dot{0%,80%,100%{opacity:.2;transform:scale(.8)}40%{opacity:1;transform:scale(1)}}
.cal-strip{display:flex;gap:4px;flex-wrap:wrap;margin-top:8px;}
.cal-day{width:28px;height:28px;border-radius:3px;display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:9px;cursor:pointer;transition:all .15s;}
.grade-dot{width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:4px;}
.prog-bar-wrap{margin-bottom:12px;}
.prog-bar-h{display:flex;justify-content:space-between;font-size:11px;margin-bottom:5px;}
.prog-bar-t{height:4px;background:#2a2a38;border-radius:2px;overflow:hidden;}
.prog-bar-f{height:100%;border-radius:2px;}
@media(max-width:800px){.g4{grid-template-columns:1fr 1fr;}.g7{grid-template-columns:repeat(4,1fr);}}
@media(max-width:520px){.g3,.g2{grid-template-columns:1fr;}.g7{grid-template-columns:1fr 1fr;}}
@media(max-width:640px){
  .desktop-module-nav{display:none!important;}
  .mobile-bottom-nav{display:flex!important;}
  .app-header{padding:16px 16px 14px!important;}
  .notif-pad{padding:8px 16px!important;}
  .notif-inner{padding:0 16px 12px!important;}
  .score-strip{padding:8px 0!important;}
  .score-strip-badge{padding:8px 14px!important;}
  .score-strip-ind{padding:8px 10px!important;min-width:70px!important;font-size:8px!important;}
  .tab-content{padding:16px 12px 90px!important;}
  .sub-tabs{padding:0 4px!important;}
  /* Tables: always scrollable on mobile */
  .tbl-wrap{overflow-x:auto!important;-webkit-overflow-scrolling:touch;}
  /* Cards: reduce padding */
  .card{padding:12px!important;}
  /* Sec headers: tighter */
  .sec-h{font-size:9px!important;margin-bottom:12px!important;}
  /* Onboarding card */
  .onboard-card{width:100%!important;max-width:100%!important;padding:20px 16px!important;}
  /* Score tab: stack trajectory cards */
  .traj-grid{grid-template-columns:1fr 1fr!important;}
  /* Labs comparison table */
  .labs-cmp{font-size:9px!important;}
  .labs-cmp th,.labs-cmp td{padding:7px 8px!important;}
  /* HOY — food log entry items */
  .food-entry-row{flex-wrap:wrap!important;}
  /* Hide less critical columns in tables on very small screens */
  .hide-xs{display:none!important;}
  /* Charts: shorter on mobile */
  .chart-wrap .recharts-responsive-container{height:160px!important;}
}
@media(max-width:400px){
  .traj-grid{grid-template-columns:1fr!important;}
  .g2,.g3{grid-template-columns:1fr!important;}
}
@media(min-width:641px){
  .mobile-bottom-nav{display:none!important;}
  .desktop-module-nav{display:flex!important;}
}
.app-header{padding:32px 44px 26px;border-bottom:1px solid #2a2a38;display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap;background:#131318;position:relative;overflow:hidden;}
`;



// ═══════════════════════════════════════════════════════
// ONBOARDING WIZARD
// ═══════════════════════════════════════════════════════
const ONBOARDING_STEPS = [
  { id:"welcome",   icon:"👋", title:"Bienvenido",          sub:"Cuéntanos sobre ti" },
  { id:"body",      icon:"📊", title:"Composición corporal", sub:"Tu punto de partida" },
  { id:"health",    icon:"🩺", title:"Salud & Metas",        sub:"Contexto clínico" },
  { id:"training",  icon:"⚡", title:"Entrenamiento",         sub:"Tu equipo y rutina" },
  { id:"nutrition", icon:"🥗", title:"Nutrición",            sub:"Metas de macros" },
];

function OnboardingWizard({ userEmail, defaultEquipment, defaultSupplements, onComplete }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    name: userEmail?.split("@")[0] || "",
    age: "",
    weight: "",
    height: "",
    goals: "Recomposición corporal, reducir grasa visceral",
    health_notes: "",
    conditions: [],
    medications: [],
    equipment: defaultEquipment,
    supplements: defaultSupplements,
    session_duration: "45-60 min",
    training_days: 5,
    targets: { calories: 2300, protein: 165, carbs: 215, fats: 62 },
  });
  const [condDraft, setCondDraft] = useState("");
  const [medDraft, setMedDraft] = useState("");

  const upd = (k, v) => setData(d => ({ ...d, [k]: v }));
  const isLast = step === ONBOARDING_STEPS.length - 1;

  // Auto-calculate targets from weight/goals when user fills body data
  const calcTargets = (weight, goals) => {
    const w = parseFloat(weight) || 80;
    const protein = Math.round(w * 2.0);
    const calories = Math.round(w * 28);
    const fats = Math.round(calories * 0.25 / 9);
    const carbs = Math.round((calories - protein * 4 - fats * 9) / 4);
    return { calories, protein, carbs: Math.max(carbs, 100), fats };
  };

  const handleNext = () => {
    if (step === 1 && data.weight) {
      upd("targets", calcTargets(data.weight, data.goals));
    }
    if (isLast) {
      const healthNotes = [
        data.health_notes,
        data.conditions.length > 0 ? `Condiciones: ${data.conditions.join(", ")}` : "",
        data.medications.length > 0 ? `Medicamentos: ${data.medications.join(", ")}` : "",
      ].filter(Boolean).join(". ");
      onComplete({ ...data, health_notes: healthNotes });
    } else {
      setStep(s => s + 1);
    }
  };

  const canNext = () => {
    if (step === 0) return data.name.trim().length > 0;
    if (step === 1) return data.weight !== "" && data.age !== "";
    return true;
  };

  const S = {
    overlay: { position:"fixed",inset:0,background:"#0c0c0f",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"'Instrument Sans',sans-serif" },
    card:    { width:"100%",maxWidth:520,background:"#131318",border:"1px solid #2a2a38",borderRadius:6,padding:28,position:"relative" },
    inp:     { width:"100%",background:"#0c0c0f",border:"1px solid #2a2a38",borderRadius:3,padding:"10px 14px",color:"#e8e8f0",fontFamily:"'Instrument Sans',sans-serif",fontSize:14,outline:"none",boxSizing:"border-box" },
    lbl:     { fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",letterSpacing:".15em",textTransform:"uppercase",color:"#44445a",display:"block",marginBottom:6 },
  };

  const curr = ONBOARDING_STEPS[step];

  return (
    <div style={S.overlay}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Instrument+Sans:wght@0,400;0,500;0,600&family=JetBrains+Mono:wght@400;500&display=swap');
        .ob-inp:focus { border-color: #a8ff3e !important; }
        .ob-inp::placeholder { color: #44445a; }
        .ob-btn:hover { opacity: .88; }
      `}</style>

      {/* Background glow */}
      <div style={{position:"fixed",top:"40%",left:"50%",transform:"translate(-50%,-50%)",width:600,height:600,background:"radial-gradient(circle,rgba(168,255,62,.04),transparent 65%)",pointerEvents:"none"}}/>

      <div style={S.card}>
        {/* Progress bar */}
        <div style={{display:"flex",gap:4,marginBottom:28}}>
          {ONBOARDING_STEPS.map((s,i) => (
            <div key={s.id} style={{flex:1,height:3,borderRadius:2,background:i<=step?"#a8ff3e":"#2a2a38",transition:"background .3s"}}/>
          ))}
        </div>

        {/* Step header */}
        <div style={{marginBottom:24}}>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#44445a",letterSpacing:".2em",marginBottom:8,textTransform:"uppercase"}}>
            PASO {step+1} DE {ONBOARDING_STEPS.length}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:4}}>
            <span style={{fontSize:28}}>{curr.icon}</span>
            <div>
              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:24,lineHeight:1,color:"#e8e8f0"}}>{curr.title}</div>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"10px",color:"#44445a",marginTop:3}}>{curr.sub}</div>
            </div>
          </div>
        </div>

        {/* ── Step 0: Welcome / Name ── */}
        {step === 0 && (
          <div>
            <div style={{marginBottom:16}}>
              <label style={S.lbl}>¿Cómo te llamas?</label>
              <input value={data.name} onChange={e=>upd("name",e.target.value)}
                placeholder="Tu nombre completo" className="ob-inp"
                style={{...S.inp,fontSize:18,fontWeight:600,fontFamily:"'Syne',sans-serif"}}
                onKeyDown={e=>e.key==="Enter"&&canNext()&&handleNext()}
                autoFocus
              />
            </div>
            <div style={{background:"rgba(168,255,62,.05)",border:"1px solid rgba(168,255,62,.1)",borderRadius:4,padding:"14px 16px"}}>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#a8ff3e",letterSpacing:".15em",marginBottom:6}}>QUÉ CONSTRUIMOS JUNTOS</div>
              <div style={{fontSize:12,color:"#8888a8",lineHeight:1.7}}>
                Tu dashboard personal de salud metabólica. Tracking de nutrición con IA, composición corporal, labs y rutinas — todo conectado para optimizar tu salud.
              </div>
            </div>
          </div>
        )}

        {/* ── Step 1: Body data ── */}
        {step === 1 && (
          <div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
              <div>
                <label style={S.lbl}>Edad</label>
                <input type="number" value={data.age} onChange={e=>upd("age",e.target.value)}
                  placeholder="39" className="ob-inp" style={S.inp} min={18} max={99}/>
              </div>
              <div>
                <label style={S.lbl}>Peso actual (kg)</label>
                <input type="number" value={data.weight} onChange={e=>{ upd("weight",e.target.value); }}
                  placeholder="82" className="ob-inp" style={S.inp} step="0.1"/>
              </div>
              <div>
                <label style={S.lbl}>Altura (cm)</label>
                <input type="number" value={data.height} onChange={e=>upd("height",e.target.value)}
                  placeholder="175" className="ob-inp" style={S.inp}/>
              </div>
              <div>
                <label style={S.lbl}>Días de entreno/semana</label>
                <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:4}}>
                  {[3,4,5,6].map(d=>(
                    <button key={d} onClick={()=>upd("training_days",d)} style={{
                      flex:1,padding:"8px 4px",border:"none",borderRadius:3,cursor:"pointer",
                      background:data.training_days===d?"#a8ff3e":"#1a1a22",
                      color:data.training_days===d?"#0c0c0f":"#8888a8",
                      fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:16,
                    }}>{d}</button>
                  ))}
                </div>
              </div>
            </div>
            {data.weight && (
              <div style={{background:"rgba(77,200,255,.06)",border:"1px solid rgba(77,200,255,.15)",borderRadius:3,padding:"10px 14px"}}>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#4dc8ff",letterSpacing:".12em",marginBottom:4}}>MACROS SUGERIDOS PARA {data.weight}kg</div>
                {(() => { const t = calcTargets(data.weight, data.goals); return (
                  <div style={{display:"flex",gap:16,fontFamily:"'JetBrains Mono',monospace",fontSize:"10px",color:"#8888a8"}}>
                    <span><strong style={{color:"#ffb830"}}>{t.calories}</strong> kcal</span>
                    <span><strong style={{color:"#4dc8ff"}}>{t.protein}g</strong> prot</span>
                    <span><strong style={{color:"#a8ff3e"}}>{t.carbs}g</strong> carbs</span>
                    <span><strong style={{color:"#ff7a4d"}}>{t.fats}g</strong> grasas</span>
                  </div>
                ); })()}
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#44445a",marginTop:4}}>Ajustable en la siguiente pantalla</div>
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Health & Goals ── */}
        {step === 2 && (
          <div>
            <div style={{marginBottom:14}}>
              <label style={S.lbl}>Objetivo principal</label>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {[
                  ["Recomposición corporal (perder grasa + ganar músculo)","Recomposición corporal, reducir grasa visceral"],
                  ["Perder peso","Pérdida de peso, déficit calórico controlado"],
                  ["Ganar masa muscular","Ganancia muscular, superávit calórico moderado"],
                  ["Salud general y longevidad","Salud general, mejorar marcadores metabólicos"],
                ].map(([label, val])=>(
                  <button key={val} onClick={()=>upd("goals",val)} style={{
                    padding:"10px 14px",border:`1px solid ${data.goals===val?"#a8ff3e":"#2a2a38"}`,
                    borderRadius:3,cursor:"pointer",textAlign:"left",
                    background:data.goals===val?"rgba(168,255,62,.08)":"#0c0c0f",
                    color:data.goals===val?"#e8e8f0":"#8888a8",
                    fontSize:13,fontFamily:"'Instrument Sans',sans-serif",
                    transition:"all .15s",
                  }}>{label}</button>
                ))}
              </div>
            </div>
            <div style={{marginBottom:14}}>
              <label style={S.lbl}>Condiciones médicas (opcional — selecciona todas las que apliquen)</label>
              {(()=>{
                const PRESET_CONDITIONS = [
                  {id:"col_alto",  label:"Colesterol alto",     icon:"🩸"},
                  {id:"sindr_met", label:"Síndrome metabólico", icon:"⚠️"},
                  {id:"prediab",   label:"Prediabetes",         icon:"🍬"},
                  {id:"dm2",       label:"Diabetes tipo 2",     icon:"💉"},
                  {id:"hipert",    label:"Hipertensión",        icon:"❤️"},
                  {id:"hipot",     label:"Hipotiroidismo",      icon:"🦋"},
                  {id:"higado",    label:"Hígado graso",        icon:"🫀"},
                  {id:"resistins", label:"Resistencia a insulina", icon:"⚡"},
                  {id:"sop",       label:"SOP",                 icon:"🔄"},
                  {id:"apnea",     label:"Apnea del sueño",     icon:"😴"},
                  {id:"artritis",  label:"Artritis / inflamación crónica", icon:"🦴"},
                  {id:"hiper_ac",  label:"Hiperuricemia / gota",icon:"🧪"},
                ];
                const toggle = (label) => {
                  const curr = data.conditions;
                  const next = curr.includes(label)
                    ? curr.filter(x=>x!==label)
                    : [...curr, label];
                  upd("conditions", next);
                };
                return (
                  <div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(175px,1fr))",gap:6,marginBottom:10}}>
                      {PRESET_CONDITIONS.map(c=>{
                        const active = data.conditions.includes(c.label);
                        return (
                          <button key={c.id} onClick={()=>toggle(c.label)} style={{
                            display:"flex",alignItems:"center",gap:7,
                            padding:"8px 10px",borderRadius:3,cursor:"pointer",textAlign:"left",
                            border:`1px solid ${active?"#ffb830":"#2a2a38"}`,
                            background:active?"rgba(255,184,48,.08)":"#0c0c0f",
                            color:active?"#ffb830":"#8888a8",
                            fontFamily:"'Instrument Sans',sans-serif",fontSize:12,
                            transition:"all .12s",
                          }}>
                            <span style={{fontSize:14,flexShrink:0}}>{c.icon}</span>
                            <span>{c.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    {/* "Otra" free-text chip input */}
                    <div style={{display:"flex",gap:6,alignItems:"center"}}>
                      <ChipInput label="" icon="" items={data.conditions.filter(x=>!PRESET_CONDITIONS.map(p=>p.label).includes(x))}
                        color="#ffb830" onChange={v=>{
                          const presetSelected = data.conditions.filter(x=>PRESET_CONDITIONS.map(p=>p.label).includes(x));
                          upd("conditions",[...presetSelected,...v]);
                        }}/>
                    </div>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:"#44445a",marginTop:4}}>
                      ↑ Escribe condiciones adicionales arriba y presiona Enter
                    </div>
                    {data.conditions.length>0 && (
                      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:"#ffb830",marginTop:6}}>
                        ✓ {data.conditions.length} condición{data.conditions.length>1?"es":""} seleccionada{data.conditions.length>1?"s":""}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
            <div>
              <label style={S.lbl}>Medicamentos actuales (opcional)</label>
              <ChipInput label="" icon="" items={data.medications} color="#4dc8ff"
                onChange={v=>upd("medications",v)}/>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#44445a",marginTop:-8}}>
                Ej: Rosuvastatina 10mg, Metformina, Levotiroxina
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Training ── */}
        {step === 3 && (
          <div>
            <ChipInput label="Equipo disponible" icon="🏋️"
              items={data.equipment} color="#a8ff3e"
              onChange={v=>upd("equipment",v)}/>
            <ChipInput label="Suplementos actuales" icon="💊"
              items={data.supplements} color="#4dc8ff"
              onChange={v=>upd("supplements",v)}/>
            <div style={{marginBottom:14}}>
              <label style={S.lbl}>Duración por sesión</label>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {["30 min","45 min","45-60 min","60 min","60-90 min","90 min"].map(d=>(
                  <button key={d} onClick={()=>upd("session_duration",d)} style={{
                    padding:"7px 12px",border:"none",borderRadius:3,cursor:"pointer",
                    background:data.session_duration===d?"#a8ff3e":"#1a1a22",
                    color:data.session_duration===d?"#0c0c0f":"#8888a8",
                    fontFamily:"'JetBrains Mono',monospace",fontSize:"10px",letterSpacing:".06em",
                    transition:"all .15s",
                  }}>{d}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 4: Nutrition targets ── */}
        {step === 4 && (
          <div>
            <div style={{background:"rgba(168,255,62,.05)",border:"1px solid rgba(168,255,62,.1)",borderRadius:4,padding:"12px 14px",marginBottom:16}}>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#a8ff3e",letterSpacing:".12em",marginBottom:4}}>MACROS CALCULADOS PARA TU PERFIL</div>
              <div style={{fontSize:12,color:"#8888a8"}}>Basado en {data.weight}kg · {data.goals.split(",")[0]}. Puedes ajustar ahora o después en CONFIG.</div>
            </div>
            {[
              {k:"calories",label:"Calorías diarias",unit:"kcal",color:"#ffb830",min:1200,max:4000},
              {k:"protein", label:"Proteína",unit:"g",color:"#4dc8ff",min:50,max:300},
              {k:"carbs",   label:"Carbohidratos",unit:"g",color:"#a8ff3e",min:50,max:500},
              {k:"fats",    label:"Grasas",unit:"g",color:"#ff7a4d",min:30,max:200},
            ].map(({k,label,unit,color,min,max})=>(
              <div key={k} style={{marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <label style={{...S.lbl,marginBottom:0}}>{label}</label>
                  <span style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:20,color}}>{data.targets[k]}<span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:"#44445a",marginLeft:2}}>{unit}</span></span>
                </div>
                <input type="range" min={min} max={max} step={k==="calories"?50:5}
                  value={data.targets[k]}
                  onChange={e=>upd("targets",{...data.targets,[k]:Number(e.target.value)})}
                  style={{width:"100%",accentColor:color,cursor:"pointer"}}
                />
                <div style={{display:"flex",justifyContent:"space-between",fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:"#44445a"}}>
                  <span>{min}{unit}</span><span>{max}{unit}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Navigation */}
        <div style={{display:"flex",gap:10,marginTop:20,alignItems:"center"}}>
          {step > 0 && (
            <button onClick={()=>setStep(s=>s-1)} style={{
              background:"none",border:"1px solid #2a2a38",borderRadius:3,
              color:"#8888a8",padding:"11px 16px",cursor:"pointer",
              fontFamily:"'JetBrains Mono',monospace",fontSize:"10px",letterSpacing:".1em",
            }}>← ATRÁS</button>
          )}
          <button onClick={handleNext} disabled={!canNext()} className="ob-btn" style={{
            flex:1,padding:"13px",background:canNext()?"#a8ff3e":"#1e1e2a",
            color:canNext()?"#0c0c0f":"#44445a",border:"none",borderRadius:3,cursor:canNext()?"pointer":"default",
            fontFamily:"'JetBrains Mono',monospace",fontSize:"11px",fontWeight:700,letterSpacing:".18em",
            transition:"all .15s",
          }}>
            {isLast ? "✓ COMENZAR MI DASHBOARD →" : "CONTINUAR →"}
          </button>
        </div>

        {/* Skip option */}
        {step > 0 && !isLast && (
          <div style={{textAlign:"center",marginTop:12}}>
            <button onClick={()=>setStep(s=>s+1)} style={{
              background:"none",border:"none",cursor:"pointer",
              fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#2a2a38",letterSpacing:".1em",
            }}>SALTAR ESTE PASO</button>
          </div>
        )}
      </div>
    </div>
  );
}

function ChipInput({ label, icon, items, color="#a8ff3e", onChange }) {
  const [draft, setDraft] = useState("");
  const addItem = () => {
    const v = draft.trim();
    if (v && !items.includes(v)) onChange([...items, v]);
    setDraft("");
  };
  return (
    <div style={{marginBottom:14}}>
      <div className="lbl" style={{marginBottom:6}}>{icon} {label}</div>
      {/* Chips */}
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8,minHeight:items.length>0?0:0}}>
        {items.map((item,i)=>(
          <div key={i} style={{
            display:"inline-flex",alignItems:"center",gap:6,
            background:`${color}12`,border:`1px solid ${color}30`,
            borderRadius:3,padding:"4px 10px",
            fontFamily:"'Instrument Sans',sans-serif",fontSize:12,color:"#e8e8f0",
          }}>
            <span>{item}</span>
            <button onClick={()=>onChange(items.filter((_,j)=>j!==i))} style={{
              background:"none",border:"none",cursor:"pointer",
              color:"#44445a",fontSize:14,lineHeight:1,padding:0,
              display:"flex",alignItems:"center",
            }}>×</button>
          </div>
        ))}
        {items.length===0 && <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#44445a",letterSpacing:".08em"}}>SIN ÍTEMS</span>}
      </div>
      {/* Input row */}
      <div style={{display:"flex",gap:6}}>
        <input
          value={draft}
          onChange={e=>setDraft(e.target.value)}
          onKeyDown={e=>{ if(e.key==="Enter"){e.preventDefault();addItem();} }}
          placeholder="Escribe y presiona Enter para agregar…"
          className="inp"
          style={{flex:1,fontSize:12}}
        />
        <button className="btn-sm" onClick={addItem} style={{flexShrink:0,color:color,borderColor:`${color}40`}}>+</button>
      </div>
    </div>
  );
}

function ProfileEditor({ userProfile, onSave }) {
  const [editing, setEditing] = useState(false);
  const [tmp, setTmp] = useState(userProfile);
  useEffect(() => { if (!editing) setTmp(userProfile); }, [userProfile, editing]);
  if (!editing) return (
    <div>
      <div style={{fontSize:12,color:"#8888a8",marginBottom:8,lineHeight:1.6}}><strong style={{color:"#e8e8f0"}}>Objetivos:</strong> {userProfile.goals}</div>
      <div style={{fontSize:12,color:"#8888a8",marginBottom:8,lineHeight:1.6}}><strong style={{color:"#e8e8f0"}}>Clínico:</strong> {userProfile.health_notes}</div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
        {userProfile.equipment.map((e,i)=>(
          <span key={i} style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",background:"rgba(168,255,62,.08)",color:"#a8ff3e",borderRadius:2,padding:"2px 7px"}}>{e}</span>
        ))}
      </div>
      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#44445a",marginBottom:12}}>{userProfile.supplements.length} suplementos · {userProfile.session_duration} · {userProfile.training_days}d/semana</div>
      <button className="btn-sm" onClick={()=>setEditing(true)}>EDITAR PERFIL</button>
    </div>
  );
  return (
    <div>
      <div style={{marginBottom:10}}>
        <div className="lbl" style={{marginBottom:4}}>🎯 Objetivos</div>
        <textarea value={tmp.goals} onChange={e=>setTmp({...tmp,goals:e.target.value})} className="inp" rows={2} style={{resize:"vertical"}}/>
      </div>
      <div style={{marginBottom:10}}>
        <div className="lbl" style={{marginBottom:4}}>🩺 Contexto clínico</div>
        <textarea value={tmp.health_notes} onChange={e=>setTmp({...tmp,health_notes:e.target.value})} className="inp" rows={2} style={{resize:"vertical"}}/>
      </div>
      <ChipInput
        label="Equipo disponible" icon="🏋️"
        items={tmp.equipment} color="#a8ff3e"
        onChange={v=>setTmp({...tmp,equipment:v})}
      />
      <ChipInput
        label="Suplementos" icon="💊"
        items={tmp.supplements} color="#4dc8ff"
        onChange={v=>setTmp({...tmp,supplements:v})}
      />
      <div className="g2" style={{gap:8,marginBottom:14}}>
        <div>
          <div className="lbl" style={{marginBottom:4}}>⏱ Duración sesión</div>
          <input value={tmp.session_duration} onChange={e=>setTmp({...tmp,session_duration:e.target.value})} className="inp"/>
        </div>
        <div>
          <div className="lbl" style={{marginBottom:4}}>📅 Días/semana</div>
          <input type="number" min={1} max={7} value={tmp.training_days} onChange={e=>setTmp({...tmp,training_days:Number(e.target.value)})} className="inp"/>
        </div>
      </div>
      <div style={{display:"flex",gap:8}}>
        <button className="btn" style={{flex:1}} onClick={()=>{onSave(tmp);setEditing(false);}}>✓ GUARDAR PERFIL</button>
        <button className="btn-sm" onClick={()=>setEditing(false)}>CANCELAR</button>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────
// METABOLIC SCORE ENGINE
// Returns { score:0-100, grade, indicators[], components[] }
// All inputs optional — score adjusts to available data
// ─────────────────────────────────────────────────────────────
function calcMetabolicScore(labResults=[], allInbody=[], log={}, targets={}) {
  const lab  = labResults[labResults.length-1] || null;
  const body = allInbody[allInbody.length-1]   || null;

  let totalWeight = 0, totalScore = 0;
  const components = [];
  const indicators = [];

  // ── 1. Glucosa / Insulina (30%) ──
  if (lab?.hba1c != null || lab?.glucose != null) {
    let pts = 100;
    const hba1c   = lab?.hba1c;
    const glucose = lab?.glucose;
    if (hba1c   != null) pts = Math.min(pts, hba1c   <= 5.4 ? 100 : hba1c <= 5.7 ? 80 : hba1c <= 6.0 ? 55 : hba1c <= 6.5 ? 30 : 10);
    if (glucose != null) pts = Math.min(pts, glucose  < 90   ? 100 : glucose < 100 ? 80 : glucose < 110 ? 55 : glucose < 126 ? 30 : 10);
    // HOMA-IR if insulin available
    const insulin = lab?.insulin;
    if (insulin != null && glucose != null) {
      const homa = (glucose * insulin) / 405;
      pts = Math.min(pts, homa < 1.0 ? 100 : homa < 1.5 ? 85 : homa < 2.0 ? 65 : homa < 2.5 ? 45 : 20);
      components.push({ label:"HOMA-IR", value:homa.toFixed(2), target:"<1.5", status: homa<1.5?"ok":homa<2.5?"warn":"bad", weight:10 });
      indicators.push({ label:"HOMA-IR", value:homa.toFixed(2), status: homa<1.5?"ok":homa<2.5?"warn":"bad" });
    }
    totalScore  += pts * 0.30; totalWeight += 0.30;
    if (hba1c != null) {
      components.push({ label:"HbA1c", value:`${hba1c}%`, target:"<5.7%", status: hba1c<=5.7?"ok":hba1c<=6.0?"warn":"bad", weight:15 });
      indicators.push({ label:"HBA1C", value:`${hba1c}%`, status: hba1c<=5.7?"ok":hba1c<=6.0?"warn":"bad" });
    }
    if (glucose != null) {
      components.push({ label:"Glucosa", value:`${glucose} mg/dL`, target:"<100", status: glucose<100?"ok":glucose<110?"warn":"bad", weight:15 });
    }
  }

  // ── 2. Perfil Lipídico (25%) ──
  if (lab?.ldl != null || lab?.hdl != null || lab?.tg != null) {
    let pts = 100;
    const ldl = lab?.ldl, hdl = lab?.hdl, tg = lab?.tg;
    if (ldl != null) pts = Math.min(pts, ldl < 100 ? 100 : ldl < 130 ? 75 : ldl < 160 ? 45 : 20);
    if (hdl != null) pts = Math.min(pts, hdl > 60  ? 100 : hdl > 50  ? 85 : hdl > 40  ? 60 : 30);
    if (tg  != null) pts = Math.min(pts, tg  < 100 ? 100 : tg  < 150 ? 80 : tg  < 200 ? 50 : 20);
    // TG/HDL ratio
    if (tg != null && hdl != null && hdl > 0) {
      const ratio = +(tg / hdl).toFixed(2);
      const rStatus = ratio < 1.5 ? "ok" : ratio < 2.5 ? "warn" : "bad";
      components.push({ label:"TG/HDL", value:ratio.toFixed(1), target:"<1.5", status:rStatus, weight:10 });
      indicators.push({ label:"TG/HDL", value:ratio.toFixed(1), status:rStatus });
    }
    totalScore  += pts * 0.25; totalWeight += 0.25;
    if (ldl != null) {
      components.push({ label:"LDL", value:`${ldl} mg/dL`, target:"<100", status: ldl<100?"ok":ldl<130?"warn":"bad", weight:10 });
      indicators.push({ label:"LDL", value:`${ldl}`, status: ldl<100?"ok":ldl<130?"warn":"bad" });
    }
    if (hdl != null) components.push({ label:"HDL", value:`${hdl} mg/dL`, target:">60", status: hdl>60?"ok":hdl>40?"warn":"bad", weight:8 });
  }

  // ── 3. Composición Corporal (25%) ──
  if (body) {
    let pts = 100;
    const fat = body.f, muscle = body.m, weight = body.w;
    if (fat    != null) pts = Math.min(pts, fat < 12  ? 100 : fat < 18  ? 85 : fat < 25  ? 60 : fat < 30  ? 35 : 15);
    if (muscle != null && weight != null) {
      const smmi = muscle / ((body.h||170)/100)**2; // skeletal muscle mass index approx
      pts = Math.min(pts, smmi > 10 ? 100 : smmi > 8.5 ? 85 : smmi > 7 ? 65 : 40);
    }
    totalScore += pts * 0.25; totalWeight += 0.25;
    if (fat != null) {
      components.push({ label:"% Grasa", value:`${fat}%`, target:"<18%", status: fat<18?"ok":fat<25?"warn":"bad", weight:13 });
      indicators.push({ label:"GRASA", value:`${fat}%`, status: fat<18?"ok":fat<25?"warn":"bad" });
    }
    if (muscle != null) components.push({ label:"Músculo", value:`${muscle} kg`, target:"↑", status:"ok", weight:12 });
  }

  // ── 4. Adherencia Nutricional (20%) ──
  const logDays = Object.keys(log);
  if (logDays.length >= 3) {
    const last14 = logDays.slice(-14);
    const proteinDays = last14.filter(d => {
      const entries = log[d] || [];
      const totalProt = entries.reduce((a,e)=>a+(e.protein||0),0);
      return targets.protein ? totalProt >= targets.protein * 0.85 : totalProt >= 120;
    });
    const streak = (()=>{
      let s = 0;
      // Use local date (not UTC) to avoid timezone offset breaking the streak
      const localKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const today = new Date();
      // If today has no entries yet, still allow streak to count from yesterday
      const startOffset = log[localKey(today)]?.length > 0 ? 0 : 1;
      for (let i=startOffset; i<30; i++) {
        const d = new Date(today); d.setDate(d.getDate()-i);
        if (log[localKey(d)]?.length > 0) s++; else break;
      }
      return s;
    })();
    const adherence = Math.round((proteinDays.length / last14.length) * 100);
    const adherenceStatus = adherence >= 80 ? "ok" : adherence >= 60 ? "warn" : "bad";
    const streakStatus    = streak >= 7 ? "ok" : streak >= 3 ? "warn" : "bad";
    const pts = (adherence * 0.7) + (Math.min(streak, 14) / 14 * 100 * 0.3);
    totalScore += pts * 0.20; totalWeight += 0.20;
    components.push({ label:"Adherencia proteína", value:`${adherence}%`, target:">80%", status:adherenceStatus, weight:10 });
    components.push({ label:"Racha de registro", value:`${streak} días`, target:"≥7 días", status:streakStatus, weight:10 });
    indicators.push({ label:"ADHERENCIA", value:`${adherence}%`, status:adherenceStatus });
    indicators.push({ label:"RACHA", value:`${streak}d`, status:streakStatus });
  }

  if (totalWeight === 0) return null; // no data at all

  // Normalize to available data weight
  const normalizedScore = Math.round(totalScore / totalWeight);
  const grade = normalizedScore >= 80 ? "A" : normalizedScore >= 65 ? "B" : normalizedScore >= 50 ? "C" : normalizedScore >= 35 ? "D" : "F";

  return { score: Math.min(100, Math.max(0, normalizedScore)), grade, components, indicators };
}

const USER_PROFILE_DEFAULT = {
  name: "Usuario",
  equipment: ["Mancuernas 10/25/30 lbs","KB 24kg","Chaleco lastrado 15 lbs","Bandas elásticas","Barras calistenia parque","Cuerda de saltar"],
  supplements: ["Vitamina D3 2000-5000 UI (mañana)","Vitamina C 500-1000mg (mañana)","Zinc 15-25mg (mañana)","Omega-3 2-4g EPA+DHA (mañana)","Creatina 5g (post-entreno)","Whey isolate 30g (post-entreno)","Magnesio glicinato 400mg (noche)","Rosuvastatina (con cena)"],
  goals: "Recomposición corporal, reducir grasa visceral, mejorar LDL y HbA1c",
  health_notes: "LDL meta <100 mg/dL, HbA1c meta <5.7%, toma rosuvastatina",
  session_duration: "45-60 min",
  training_days: 5,
};
function AppInner() {
  const router = useRouter();
  const [user, setUser]   = useState(null);   // Supabase user object
  const [authLoading, setAuthLoading] = useState(true);
  const [tab, setTab] = useState("hoy");
  const [targets, setTargets] = useState(TARGETS_DEF);
  const [log, setLog]     = useState({});
  const [favs, setFavs]   = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [selDate, setSelDate] = useState(todayStr());
  const [showAdd, setShowAdd] = useState(false);
  const [addMode, setAddMode] = useState("ai");
  const [offQuery, setOffQuery] = useState("");
  const [offResults, setOffResults] = useState([]);
  const [offLoading, setOffLoading] = useState(false);
  const [offSelected, setOffSelected] = useState(null); // selected product
  const [offGrams, setOffGrams] = useState(100);
  const [offSearched, setOffSearched] = useState(false);
  const [selMeal, setSelMeal]       = useState("Desayuno");
  const [selDayType, setSelDayType] = useState("entreno");
  const [aiInput, setAiInput] = useState("");
  const [aiImage, setAiImage] = useState(null);
  const [aiB64, setAiB64]     = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult]   = useState(null);
  const [manForm, setManForm] = useState({name:"",calories:0,protein:0,carbs:0,fats:0,grade:"B",meal:"Almuerzo"});
  const [favForm, setFavForm] = useState({name:"",calories:0,protein:0,carbs:0,fats:0});
  const [showFavForm, setShowFavForm] = useState(false);
  const [exportJson, setExportJson] = useState(null);
  const [importJson, setImportJson] = useState(null);
  const [importText, setImportText] = useState("");
  const [editTargets, setEditTargets] = useState(false);
  const [tmpTargets, setTmpTargets]   = useState(TARGETS_DEF);
  const [dragOver, setDragOver] = useState(false);
  // InBody upload
  const [inbodyLoading, setInbodyLoading] = useState(false);
  const [inbodyResult, setInbodyResult]   = useState(null);
  const [inbodyB64, setInbodyB64] = useState(null);
  const [showManualInbody, setShowManualInbody] = useState(false);
  const [manualInbody, setManualInbody] = useState({date:"",weight:"",muscle:"",fat_pct:"",visceral:"",waist:"",inbody_score:"",systolic:"",diastolic:"",hr:"",otro_label:"",otro_valor:"",otro_unidad:"",note:""});
  const [customInbody, setCustomInbody] = useState([]);
  const [inbodySourceFilter, setInbodySourceFilter] = useState('all'); // 'all' | 'inbody' | 'renpho' | 'manual'
  const [briSource, setBriSource] = useState('all'); // source filter local to BRI card
  const [inbodyAgg, setInbodyAgg] = useState('auto'); // 'auto' | 'raw' | 'weekly' | 'monthly'
  const [tlSrc, setTlSrc] = useState('all'); // timeline source filter
  const [tableRows, setTableRows] = useState(15);
  const [bodyMeasurements, setBodyMeasurements] = useState([]);
  const [labResults, setLabResults] = useState([]);
  // Labs upload
  const [labsLoading, setLabsLoading] = useState(false);
  const [labsResult, setLabsResult]   = useState(null);
  const [labsB64, setLabsB64] = useState(null);
  const [showManualLabs, setShowManualLabs] = useState(false);
  const [manualLabs, setManualLabs] = useState({date:"",ldl:"",hdl:"",tc:"",tg:"",hba1c:"",glucose:"",insulin:"",psa:"",creatinina:"",ggt:"",acido_urico:"",vcm:"",hcm:"",hb:"",leucocitos:"",otro_label:"",otro_valor:"",otro_unidad:""});
  const [customLabs, setCustomLabs] = useState([]);
  const [userProfile, setUserProfile] = useState(USER_PROFILE_DEFAULT);
  // AI Routine generator
  const [routineInput, setRoutineInput] = useState("");
  const [routineLoading, setRoutineLoading] = useState(false);
  const [generatedRoutine, setGeneratedRoutine] = useState(null);
  const [activeDay, setActiveDay] = useState(0);
  const [routineTs, setRoutineTs] = useState(null);
  const [savedRoutines, setSavedRoutines] = useState([]);
  const [aiHabits, setAiHabits] = useState(null);
  const [aiHabitsLoading, setAiHabitsLoading] = useState(false);
  const [aiHabitsTs, setAiHabitsTs] = useState(null);
  // AI week insights
  const [weekInsights, setWeekInsights] = useState(null);
  const [weekInsightsLoading, setWeekInsightsLoading] = useState(false);
  const [weekInsightsTs, setWeekInsightsTs] = useState(null);
  const [tick, setTick] = useState(0); // live clock for cache age display
  const [dayInsight, setDayInsight] = useState({});
  const [dayInsightLoading, setDayInsightLoading] = useState(false);
  // Body photos
  const [bodyPhotos, setBodyPhotos]           = useState([]);
  const [pendingPhoto, setPendingPhoto]       = useState(null);
  const [photoNote, setPhotoNote]             = useState("");
  // Notifications
  const [dismissedNotifs, setDismissedNotifs] = useState([]);
  const [showNotifs, setShowNotifs]           = useState(false);

  const imgRef        = useRef();
  const backupRef     = useRef();
  const renphoRef     = useRef();
  const [showRenphoModal, setShowRenphoModal] = useState(false);
  const [renphoPreview, setRenphoPreview]     = useState(null);
  const [renphoLoading, setRenphoLoading]     = useState(false);
  const inbodyImgRef  = useRef();
  const labsImgRef    = useRef();
  const bodyPhotoRef  = useRef();
  const exportTextareaRef = useRef();

  // ── Auth listener ──
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace("/auth"); setAuthLoading(false); return; }
      setUser(session.user);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) { setUser(null); router.replace("/auth"); }
      else setUser(session.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Load all data from Supabase once user is set ──
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [profileResult, logData, favsData, photos, dbMeasurements, dbLabs] = await Promise.all([
          getProfile(user.id).catch(() => null),
          getFoodLog(user.id).catch(() => ({})),
          getFavorites(user.id).catch(() => []),
          getBodyPhotos(user.id).catch(() => []),
          getBodyMeasurements(user.id).catch(() => []),
          getLabResults(user.id).catch(() => []),
        ]);
        // Never auto-seed body/lab data — each user starts clean
        setBodyMeasurements(dbMeasurements);
        setLabResults(dbLabs);
        // Auto-create profile if trigger didn't fire
        const profile = profileResult || await upsertProfile(user.id, {
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuario',
          goals: USER_PROFILE_DEFAULT.goals,
          health_notes: USER_PROFILE_DEFAULT.health_notes,
          equipment: USER_PROFILE_DEFAULT.equipment,
          supplements: USER_PROFILE_DEFAULT.supplements,
          session_duration: USER_PROFILE_DEFAULT.session_duration,
          training_days: USER_PROFILE_DEFAULT.training_days,
          targets: TARGETS_DEF,
        }).catch(() => null);
        if (!profile) {
          // Brand new user — no profile row yet, show onboarding
          setShowOnboarding(true);
        } else if (profile) {
          const tgt = profile.targets || TARGETS_DEF;
          setTargets(tgt); setTmpTargets(tgt);
          const isNewUser = !profile.onboarded;
          setUserProfile({
            name:             profile.name             || USER_PROFILE_DEFAULT.name,
            goals:            profile.goals            || USER_PROFILE_DEFAULT.goals,
            health_notes:     profile.health_notes     || USER_PROFILE_DEFAULT.health_notes,
            equipment:        Array.isArray(profile.equipment) && profile.equipment.length > 0 ? profile.equipment : USER_PROFILE_DEFAULT.equipment,
            supplements:      Array.isArray(profile.supplements) && profile.supplements.length > 0 ? profile.supplements : USER_PROFILE_DEFAULT.supplements,
            session_duration: profile.session_duration || USER_PROFILE_DEFAULT.session_duration,
            training_days:    profile.training_days    || USER_PROFILE_DEFAULT.training_days,
          });
          if (isNewUser) setShowOnboarding(true);
        }
        if (Object.keys(logData).length > 0) {
          setLog(logData);
        } else {
          setLog({}); // new user starts with empty log — never seed INITIAL_LOG
        }
        setFavs(favsData); // always use DB data, even if empty
        if (photos.length > 0)   setBodyPhotos(photos);
        if (profile?.dismissed_notifs) setDismissedNotifs(profile.dismissed_notifs);
        const [wiCache, ahCache, rtCache, srCache] = await Promise.all([
          getAiCache(user.id, "week_insights"),
          getAiCache(user.id, "ai_habits"),
          getAiCache(user.id, "routine"),
          getAiCache(user.id, "saved_routines"),
        ]);
        if (wiCache) { setWeekInsights(wiCache.data);      setWeekInsightsTs(wiCache.ts); }
        if (ahCache) { setAiHabits(ahCache.data);          setAiHabitsTs(ahCache.ts); }
        if (rtCache) { setGeneratedRoutine(rtCache.data);  setRoutineTs(rtCache.ts); }
        if (srCache) setSavedRoutines(srCache.data || []);
      } catch(e) { console.error("Data load error:", e); }
      finally { setLoaded(true); }
    })();
  }, [user]);

  // ── Save functions ──
  const saveLog = async (newLog, changedDate = null) => {
    setLog(newLog);
    if (!user) return;
    // Only sync the changed date to avoid re-upserting entire log
    const datesToSync = changedDate ? [changedDate] : Object.keys(newLog);
    for (const date of datesToSync) {
      for (const entry of (newLog[date] || [])) {
        upsertFoodEntry(user.id, date, entry).catch(console.error);
      }
    }
  };
  const saveFavs = async (newFavs, upsertId = null) => {
    setFavs(newFavs);
    if (!user) return;
    if (upsertId) {
      const f = newFavs.find(x => x.id === upsertId);
      if (f) upsertFavorite(user.id, f).catch(console.error);
    }
  };
  const saveTargets = async (t) => {
    setTargets(t); setTmpTargets(t);
    if (user) await upsertProfile(user.id, { targets: t }).catch(console.error);
  };
  const saveCustomInbody = async (d, newRow = null) => { setCustomInbody(d); if (user && newRow) insertBodyMeasurement(user.id, newRow).catch(console.error); };
  const saveCustomLabs = async (d, newLab = null) => { setCustomLabs(d); if (user && newLab) insertLabResult(user.id, newLab).catch(console.error); };
  const saveBodyPhotos   = async (photos) => {
    setBodyPhotos(photos);
    if (user && photos.length > 0) insertBodyPhoto(user.id, photos[photos.length-1]).catch(() => {});
  };
  const dismissNotif = async id => {
    const next = [...dismissedNotifs, id];
    setDismissedNotifs(next);
    if (user) upsertProfile(user.id, { dismissed_notifs: next }).catch(console.error);
  };
  const saveUserProfile = async (p) => {
    setUserProfile(p);
    if (user) await upsertProfile(user.id, {
      goals: p.goals, health_notes: p.health_notes,
      equipment: p.equipment, supplements: p.supplements,
      session_duration: p.session_duration, training_days: p.training_days,
    }).catch(console.error);
  };

  const completeOnboarding = async (data) => {
    const newProfile = {
      name: data.name,
      goals: data.goals,
      health_notes: data.health_notes,
      equipment: data.equipment,
      supplements: data.supplements,
      session_duration: data.session_duration,
      training_days: data.training_days,
    };
    const newTargets = data.targets || targets;
    setUserProfile(newProfile);
    setTargets(newTargets); setTmpTargets(newTargets);
    setShowOnboarding(false);
    if (user) {
      await upsertProfile(user.id, {
        ...newProfile,
        targets: newTargets,
        onboarded: true,
        age:       data.age       ? Number(data.age)       : null,
        weight_kg: data.weight    ? Number(data.weight)    : null,
        height_cm: data.height    ? Number(data.height)    : null,
      }).catch(console.error);
    }
  };

  // Auto-analyze day insight — load from localStorage cache first, call API only if missing
  useEffect(() => {
    const entries = log[selDate] || [];
    if (entries.length === 0 || tab !== "hoy" || !loaded) return;
    if (dayInsight[selDate]) return; // already in state
    // Try localStorage cache first
    try {
      const cached = localStorage.getItem('insight:' + selDate);
      if (cached) {
        const parsed = JSON.parse(cached);
        setDayInsight(prev => ({...prev, [selDate]: parsed}));
        return; // served from cache, no API call
      }
    } catch(_) {}
    // Nothing cached → call API
    analyzeDayInsight(selDate, entries);
  }, [selDate, tab, loaded]);

  // ── Live clock tick every 60s so "hace Xmin" stays fresh ──
  useEffect(() => {
    const t = setInterval(() => setTick(n => n+1), 60000);
    return () => clearInterval(t);
  }, []);

  if (authLoading) return null;

  // ── ONBOARDING OVERLAY ──
  if (showOnboarding && loaded) return (
    <OnboardingWizard
      userEmail={user?.email || ""}
      defaultEquipment={USER_PROFILE_DEFAULT.equipment}
      defaultSupplements={USER_PROFILE_DEFAULT.supplements}
      onComplete={completeOnboarding}
    />
  );

  const dayLog     = log[selDate] || [];
  const totals     = calcMacros(dayLog);
  const isToday    = selDate === todayStr();
  const todayLog   = log[todayStr()] || [];
  const todayMacros = calcMacros(todayLog);
  const todayKcalPct = Math.round(todayMacros.calories / targets.calories * 100);
  const todayProtPct = Math.round(todayMacros.protein / targets.protein * 100);
  const todayInsight = dayInsight[todayStr()];
  const TRAINING_DAYS = ["PUSH","PULL","LEGS","PUSH","PULL","LEGS","DESCANSO"];
  const todayTraining = TRAINING_DAYS[new Date().getDay()===0?6:new Date().getDay()-1];
  const isTrainingDay = todayTraining !== "DESCANSO";

  const navDay = dir => {
    const d = new Date(selDate+"T12:00:00");
    d.setDate(d.getDate()+dir);
    const nd = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    if (nd <= todayStr()) setSelDate(nd);
  };
  const fmtDate = d => {
    if (d===todayStr()) return "Hoy";
    const y=new Date(); y.setDate(y.getDate()-1);
    const yStr=`${y.getFullYear()}-${String(y.getMonth()+1).padStart(2,'0')}-${String(y.getDate()).padStart(2,'0')}`;
    if (d===yStr) return "Ayer";
    return new Date(d+"T12:00:00").toLocaleDateString("es-CR",{weekday:"short",day:"numeric",month:"short"});
  };

  const resetAdd = () => { setShowAdd(false); setAiResult(null); setAiInput(""); setAiImage(null); setAiB64(null); };
  const addEntry = e => { const nl={...log,[selDate]:[...dayLog,{...e,meal:e.meal||selMeal,dayType:e.dayType||selDayType,id:Date.now()}]}; saveLog(nl, selDate); resetAdd(); };

  const searchOFF = async (q) => {
    if (!q.trim()) { setOffResults([]); setOffSearched(false); return; }
    setOffLoading(true); setOffSelected(null); setOffSearched(true);
    try {
      const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=12&fields=product_name,brands,nutriments,serving_size,image_small_url,categories_tags`;
      const res = await fetch(url);
      const data = await res.json();
      const products = (data.products||[]).filter(p => {
        const n = p.nutriments;
        return p.product_name && n && (n['energy-kcal_100g']||n['energy-kcal']) && n['proteins_100g']!=null;
      }).map(p => {
        const n = p.nutriments;
        return {
          name: p.product_name,
          brand: p.brands,
          cal100: Math.round(n['energy-kcal_100g'] || (n['energy-kcal']||0)),
          prot100: parseFloat((n['proteins_100g']||0).toFixed(1)),
          carb100: parseFloat((n['carbohydrates_100g']||0).toFixed(1)),
          fat100: parseFloat((n['fat_100g']||0).toFixed(1)),
          fiber100: parseFloat((n['fiber_100g']||0).toFixed(1)),
          serving: p.serving_size||null,
          img: p.image_small_url||null,
        };
      });
      setOffResults(products);
    } catch(e) { setOffResults([]); }
    setOffLoading(false);
  };

  const addOFF = () => {
    if (!offSelected) return;
    const g = offGrams / 100;
    const grade = offSelected.prot100 >= 15 && offSelected.fat100 <= 15 && offSelected.cal100 <= 250 ? 'A'
      : offSelected.prot100 >= 10 && offSelected.cal100 <= 400 ? 'B'
      : offSelected.cal100 <= 500 ? 'C' : 'D';
    addEntry({
      name: offSelected.name + (offSelected.brand ? ` (${offSelected.brand})` : '') + ` — ${offGrams}g`,
      calories: Math.round(offSelected.cal100 * g),
      protein: parseFloat((offSelected.prot100 * g).toFixed(1)),
      carbs: parseFloat((offSelected.carb100 * g).toFixed(1)),
      fats: parseFloat((offSelected.fat100 * g).toFixed(1)),
      grade, score: grade==='A'?9:grade==='B'?7:grade==='C'?5:3,
      source: 'off',
    });
    setOffSelected(null); setOffQuery(''); setOffResults([]); setOffSearched(false); setOffGrams(100);
  };

  const compressForAI = (dataUrl, callback) => {
    const img = new Image();
    img.onload = () => {
      const MAX = 1024; // max dimension px
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      const compressed = canvas.toDataURL("image/jpeg", 0.82);
      callback(compressed, compressed.split(",")[1]);
    };
    img.src = dataUrl;
  };

  const handleImg = e => {
    const f=e.target.files[0]; if(!f) return;
    const r=new FileReader();
    r.onload = ev => compressForAI(ev.target.result, (url, b64) => { setAiImage(url); setAiB64(b64); });
    r.readAsDataURL(f);
    e.target.value = ""; // reset so same file can be re-selected
  };
  const handleDrop = e => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0]; if(!f||!f.type.startsWith("image/")) return;
    const r = new FileReader();
    r.onload = ev => compressForAI(ev.target.result, (url, b64) => { setAiImage(url); setAiB64(b64); });
    r.readAsDataURL(f);
  };

  const analyzeAI = async () => {
    if (!aiInput && !aiB64) return;
    setAiLoading(true); setAiResult(null);
    try {
      const content = [];
      if (aiB64) content.push({type:"image",source:{type:"base64",media_type:"image/jpeg",data:aiB64}});
      if (aiInput) content.push({type:"text",text:aiInput});
      content.push({type:"text",text:`Analiza este alimento. Perfil del usuario: ${[lastInbody?`${lastInbody.w}kg, ${lastInbody.f}% grasa`:"sin InBody", userProfile.health_notes, userProfile.goals].filter(Boolean).join(". ")}. Meta kcal/día: ${targets.calories}, proteína: ${targets.protein}g. Tiempo de comida: ${selMeal}. Tipo de día: ${selDayType}. Responde SOLO JSON sin backticks:\n{"name":"string","calories":number,"protein":number,"carbs":number,"fats":number,"grade":"A/B/C/D/F","score":number,"meal":"${selMeal}","dayType":"${selDayType}","ldl_impact":"positivo/neutro/negativo","hba1c_impact":"positivo/neutro/negativo","notes":"tip personalizado breve","alerta":"alerta o null"}`});
      const res = await fetch("/api/analyze",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content}]})
      });
      const data = await res.json();
      const txt = data.content?.map(i=>i.text||"").join("")||"";
      const parsed = extractJSON(txt);
      setAiResult(parsed);
      // Auto-add to log immediately — no extra button needed
      if (!parsed.error) {
        const entryId = Date.now();
        // Compress image before saving — avoid 5MB storage limit
        let thumbDataUrl = null;
        if (aiImage) {
          try {
            const canvas = document.createElement("canvas");
            const img = new Image();
            await new Promise(res => { img.onload = res; img.src = aiImage; });
            const maxW = 600; const scale = Math.min(1, maxW / img.width);
            canvas.width = img.width * scale; canvas.height = img.height * scale;
            canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
            thumbDataUrl = canvas.toDataURL("image/jpeg", 0.72);
            imgCache.set(`img_${entryId}`, thumbDataUrl);
          } catch { thumbDataUrl = aiImage; }
        }
        const newEntry = {...parsed, meal:parsed.meal||selMeal, dayType:parsed.dayType||selDayType, id:entryId, image:thumbDataUrl};
        const nl={...log,[selDate]:[...(log[selDate]||[]),newEntry]}; saveLog(nl, selDate);
        setTimeout(()=>resetAdd(), 1800);
      }
    } catch(e) {
      setAiResult({error:"Error al analizar. Verificá la imagen o el texto e intentá de nuevo."});
    }
    setAiLoading(false);
  };

  // ── Parse InBody image with AI ──
  const parseInbodyUpload = async () => {
    if (!inbodyB64) return;
    setInbodyLoading(true); setInbodyResult(null);
    try {
      const res = await fetch("/api/analyze",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content:[
          {type:"image",source:{type:"base64",media_type:"image/jpeg",data:inbodyB64}},
          {type:"text",text:`Esta es una foto/scan de un resultado InBody. Extrae todos los valores que puedas ver. Responde SOLO JSON sin backticks ni texto extra:\n{"date":"YYYY-MM","weight":number,"muscle":number,"fat_pct":number,"visceral":number,"inbody_score":number_or_null,"whr":number_or_null,"notes":"observación breve"}\nSi no puedes leer algún valor, usa null.`}
        ]}]})
      });
      const data = await res.json();
      const txt = data.content?.map(i=>i.text||"").join("")||"";
      const parsed = extractJSON(txt);
      setInbodyResult(parsed);
    } catch(e) {
      setInbodyResult({error:"No se pudo leer el InBody. Asegurate de que la imagen sea clara."});
    }
    setInbodyLoading(false);
  };

  const confirmInbody = () => {
    if (!inbodyResult || inbodyResult.error) return;
    const entry = {
      d: inbodyResult.date || new Date().toISOString().slice(0,7).replace("-","'"),
      w: inbodyResult.weight, m: inbodyResult.muscle, f: inbodyResult.fat_pct,
      s: inbodyResult.inbody_score, vi: inbodyResult.visceral,
      whr: inbodyResult.whr, note: inbodyResult.notes || "Nuevo ◀", source: "inbody",
    };
    saveCustomInbody([...customInbody, entry], entry);
    setInbodyResult(null); setInbodyB64(null);
    alert("✓ Medición InBody agregada al historial");
  };

  const saveManualInbody = () => {
    const {date,weight,muscle,fat_pct,visceral,waist,inbody_score,systolic,diastolic,hr,otro_label,otro_valor,otro_unidad,note} = manualInbody;
    if (!date || !weight) { alert("Fecha y Peso son obligatorios"); return; }
    const wNum = parseFloat(weight), mNum = parseFloat(muscle)||null, fNum = parseFloat(fat_pct)||null;
    const viNum = parseFloat(visceral)||null, cNum = parseFloat(waist)||null, sNum = parseFloat(inbody_score)||null;
    const whrCalc = (cNum && wNum) ? parseFloat((cNum / 170).toFixed(2)) : null;
    const sysNum = parseFloat(systolic)||null, diaNum = parseFloat(diastolic)||null, hrNum = parseFloat(hr)||null;
    const otroEntry = (otro_label && otro_valor) ? {label:otro_label, valor:parseFloat(otro_valor)||otro_valor, unidad:otro_unidad||""} : null;
    const entry = { d:date, w:wNum, m:mNum, f:fNum, vi:viNum, s:sNum, whr:whrCalc, waist:cNum,
      systolic:sysNum, diastolic:diaNum, hr:hrNum, otro:otroEntry, note:note||"Manual ◀", source:"manual" };
    saveCustomInbody([...customInbody, entry], entry);
    setManualInbody({date:"",weight:"",muscle:"",fat_pct:"",visceral:"",waist:"",inbody_score:"",systolic:"",diastolic:"",hr:"",otro_label:"",otro_valor:"",otro_unidad:"",note:""});
    setShowManualInbody(false);
    alert("✓ Medición manual guardada en historial");
  };

  const saveManualLabs = async () => {
    const {date, ...rest} = manualLabs;
    if (!date) { alert("La fecha es obligatoria"); return; }
    const toNum = v => v==="" ? null : parseFloat(v);
    const entry = {
      date, user_id: user?.id,
      ldl:toNum(rest.ldl), hdl:toNum(rest.hdl), tc:toNum(rest.tc), tg:toNum(rest.tg),
      hba1c:toNum(rest.hba1c), glucose:toNum(rest.glucose), insulin:toNum(rest.insulin),
      psa:toNum(rest.psa), creatinina:toNum(rest.creatinina), ggt:toNum(rest.ggt),
      acido_urico:toNum(rest.acido_urico), vcm:toNum(rest.vcm), hcm:toNum(rest.hcm),
      hb:toNum(rest.hb), leucocitos:toNum(rest.leucocitos),
      otro: (rest.otro_label && rest.otro_valor) ? {label:rest.otro_label, valor:parseFloat(rest.otro_valor)||rest.otro_valor, unidad:rest.otro_unidad||""} : null,
      summary:"Ingreso manual"
    };
    try {
      await insertLabResult(user.id, entry);
      setLabResults(prev=>[...prev,entry].sort((a,b)=>a.date.localeCompare(b.date)));
      setManualLabs({date:"",ldl:"",hdl:"",tc:"",tg:"",hba1c:"",glucose:"",insulin:"",psa:"",creatinina:"",ggt:"",acido_urico:"",vcm:"",hcm:"",hb:"",leucocitos:"",otro_label:"",otro_valor:"",otro_unidad:""});
      setShowManualLabs(false);
      alert("✓ Resultado de laboratorio guardado");
    } catch(e) { alert("Error al guardar: "+e.message); }
  };

  // ── Parse Labs image/PDF with AI ──
  const parseLabsUpload = async () => {
    if (!labsB64) return;
    setLabsLoading(true); setLabsResult(null);
    try {
      const res = await fetch("/api/analyze",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1500,messages:[{role:"user",content:[
          {type:"image",source:{type:"base64",media_type:"image/jpeg",data:labsB64}},
          {type:"text",text:`Esta es una foto de resultados de laboratorio. Extrae todos los valores que puedas identificar. Responde SOLO JSON sin backticks:\n{"date":"YYYY-MM","ldl":number_or_null,"hdl":number_or_null,"tc":number_or_null,"tg":number_or_null,"hba1c":number_or_null,"glucose":number_or_null,"psa":number_or_null,"vcm":number_or_null,"hcm":number_or_null,"hemoglobin":number_or_null,"leucocitos":number_or_null,"creatinine":number_or_null,"urea":number_or_null,"ggt":number_or_null,"uric_acid":number_or_null,"summary":"resumen de los hallazgos más importantes en 2 oraciones"}`}
        ]}]})
      });
      const data = await res.json();
      const txt = data.content?.map(i=>i.text||"").join("")||"";
      const parsed = extractJSON(txt);
      setLabsResult(parsed);
    } catch(e) {
      setLabsResult({error:"No se pudo leer los labs. Asegurate de que la imagen sea clara."});
    }
    setLabsLoading(false);
  };

  const confirmLabs = () => {
    if (!labsResult || labsResult.error) return;
    saveCustomLabs([...customLabs, labsResult], labsResult);
    setLabsResult(null); setLabsB64(null);
    alert("✓ Resultados de laboratorio agregados");
  };


  // ── AI Routine Generator ──
  const generateRoutine = async () => {
    if (!routineInput.trim()) return;
    setRoutineLoading(true); setGeneratedRoutine(null); setRoutineTs(null);
    try {
      // Build user profile from actual state
      const lastIB = allInbody[allInbody.length-1];
      const d14 = Array.from({length:14},(_,i)=>{ const d=new Date(); d.setDate(d.getDate()-i); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; });
      const e14 = d14.flatMap(d=>log[d]||[]);
      const ld14 = d14.filter(d=>(log[d]||[]).length>0).length;
      const avgP = ld14>0?Math.round(e14.reduce((s,e)=>s+(e.protein||0),0)/ld14):0;
      const avgK = ld14>0?Math.round(e14.reduce((s,e)=>s+(e.calories||0),0)/ld14):0;
      const profile = [
        lastIB ? `InBody: ${lastIB.w}kg, ${lastIB.f}% grasa, ${lastIB.m}kg músculo, grasa visceral ${lastIB.vi}` : "Sin datos InBody",
        `Nutrición 14d: ${avgP}g proteína/día, ${avgK} kcal/día (meta: ${targets.protein}g P, ${targets.calories} kcal)`,
        `Labs: ${userProfile.health_notes}`,
        `Equipo: ${userProfile.equipment.join(", ")}`,
        `Objetivos: ${userProfile.goals}. Duración sesión: ${userProfile.session_duration}`,
      ].join(". ");
      const res = await fetch("/api/analyze",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:4096,messages:[{role:"user",content:`Eres entrenador y nutricionista deportivo experto. Genera rutina personalizada con este perfil del usuario:
${profile}
Solicitud específica: "${routineInput}"
Responde ÚNICAMENTE con este JSON (sin texto extra, sin backticks, sin markdown):
{"title":"string","description":"string","days":[{"day":"LUNES","type":"PUSH","exercises":[{"name":"string","sets":"3x10","notes":"string"}]}],"notes":"string"}
Máximo 5 días. Máximo 6 ejercicios por día. Notas de ejercicio máximo 10 palabras. Adapta la intensidad al perfil de salud del usuario.`}]})
      });
      if (!res.ok) { const err = await res.text(); throw new Error(`API ${res.status}: ${err.slice(0,200)}`); }
      const data = await res.json();
      const txt = data.content?.map(i=>i.text||"").join("")||"";
      const routine = extractJSON(txt);
      setGeneratedRoutine(routine);
      setActiveDay(0);
      const ts = Date.now();
      setRoutineTs(ts);
      await setAiCache(user.id, "routine", routine).catch(console.error);
      // Auto-save to history
      if (!routine.error) {
        const newSaved = [{...routine, savedAt:ts, request:routineInput}, ...savedRoutines].slice(0,5);
        setSavedRoutines(newSaved);
        await setAiCache(user.id, "saved_routines", newSaved).catch(console.error);
      }
    } catch(e) {
      setGeneratedRoutine({error:`Error: ${e.message}`});
    }
    setRoutineLoading(false);
  };


  // ── AI Hábitos Adaptativos ──
  const generateAiHabits = async () => {
    const allEntries = Object.entries(log).flatMap(([d,entries])=>entries.map(e=>({...e,date:d}))).slice(-20);
    setAiHabitsLoading(true); setAiHabits(null); setAiHabitsTs(null);
    try {
      const summary = allEntries.length > 0
        ? allEntries.map(e=>`${e.meal||""}: ${e.name} | Grade:${e.grade||"?"} LDL:${e.ldl_impact||"?"} HbA1c:${e.hba1c_impact||"?"}`).join("\n")
        : "Sin entradas recientes en el log";
      const res = await fetch("/api/analyze",{
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:4096,messages:[{role:"user",content:`Eres coach de salud integral. Perfil del usuario: ${lastInbody?`${lastInbody.w}kg, ${lastInbody.f}% grasa, ${lastInbody.m}kg músculo`:"sin datos InBody"}. ${userProfile.health_notes}. Suplementos actuales: ${userProfile.supplements.slice(0,5).join(", ")}.
Log reciente (${allEntries.length} comidas): ${summary.slice(0,800)}
Genera 5 hábitos personalizados y adaptativos basados en los patrones del log.
Responde ÚNICAMENTE con este JSON (sin texto extra, sin backticks):
{"habitos":[{"icono":"emoji","titulo":"string","descripcion":"string max 20 palabras","prioridad":"CRÍTICO|IMPORTANTE|RECOMENDADO","impacto":["LDL"]}],"proximos_pasos":["string","string","string"]}
Máximo 5 hábitos. Descripción máximo 20 palabras cada una.`}]})
      });
      const data = await res.json();
      const txt = data.content?.map(i=>i.text||"").join("")||"";
      const ahData = extractJSON(txt);
      setAiHabits(ahData);
      const ahTs = Date.now();
      setAiHabitsTs(ahTs);
      if (user) await setAiCache(user.id, "ai_habits", ahData).catch(console.error);
    } catch(e) { setAiHabits({error:`Error: ${e.message}`}); }
    setAiHabitsLoading(false);
  };


  // ── AI Week Insights ──
  const generateWeekInsights = async () => {
    const allEntries = Object.entries(log).flatMap(([d,entries])=>entries.map(e=>({...e,date:d}))).slice(-50);
    if (allEntries.length < 3) { setWeekInsights({text:"Necesitas al menos 3 comidas registradas para generar insights."}); return; }
    setWeekInsightsLoading(true); setWeekInsights(null); setWeekInsightsTs(null);
    try {
      const summary = allEntries.map(e=>`${e.date} ${e.meal||""}: ${e.name} (${e.calories}kcal P:${e.protein}g grade:${e.grade||"?"} LDL:${e.ldl_impact||"?"} HbA1c:${e.hba1c_impact||"?"})`).join("\n");
      const res = await fetch("/api/analyze",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1500,messages:[{role:"user",content:`
Analiza el log nutricional del usuario. Perfil: ${lastInbody?`${lastInbody.w}kg, ${lastInbody.f}% grasa, ${lastInbody.m}kg músculo`:""} ${userProfile.health_notes}. Objetivos: ${userProfile.goals}.
${summary}

Responde SOLO JSON sin backticks:
{"grade_avg":"calificación promedio A-F","pattern_alerts":["alerta1","alerta2"],"pattern_wins":["logro1","logro2"],"top_foods":["mejor comida 1","mejor comida 2"],"avoid_foods":["comida problemática 1","comida problemática 2"],"weekly_summary":"resumen de 3 oraciones de los patrones más importantes para sus metas","ldl_score":"impacto neto en LDL esta semana positivo/neutro/negativo","hba1c_score":"impacto neto en HbA1c positivo/neutro/negativo","protein_compliance":"porcentaje de días que se cumplió meta proteína"}`}]})
      });
      const data = await res.json();
      const txt = data.content?.map(i=>i.text||"").join("")||"";
      const wiData = extractJSON(txt);
      setWeekInsights(wiData);
      const wiTs = Date.now();
      setWeekInsightsTs(wiTs);
      if (user) await setAiCache(user.id, "week_insights", wiData).catch(console.error);
    } catch(e) {
      setWeekInsights({error:"Error al generar insights. Intenta de nuevo."});
    }
    setWeekInsightsLoading(false);
  };

  // ── Day Insight ──
  const analyzeDayInsight = async (dateKey, entries) => {
    if (entries.length === 0) return;
    setDayInsightLoading(true);
    try {
      const summary = entries.map(e=>`${e.meal||""}: ${e.name} (${e.calories}kcal, P:${e.protein}g, C:${e.carbs}g, G:${e.fats}g, grade:${e.grade||"?"}, LDL:${e.ldl_impact||"?"}, HbA1c:${e.hba1c_impact||"?"})`).join("\n");
      const totDay = calcMacros(entries);
      const res = await fetch("/api/analyze",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content:`
Perfil: ${userProfile.name||"Usuario"}, ${lastInbody?`${lastInbody.w}kg, ${lastInbody.f}% grasa`:"sin datos InBody"}. Metas: LDL<100 (actual ${labResults[labResults.length-1]?.ldl||"—"}), HbA1c<5.7% (actual ${labResults[labResults.length-1]?.hba1c||"—"}%), ${targets.protein}g proteína/día, ${targets.calories}kcal.
Fecha: ${dateKey}. Total del día hasta ahora: ${totDay.calories}kcal, ${totDay.protein}g proteína, ${totDay.carbs}g carbos, ${totDay.fats}g grasas.
Comidas registradas:
${summary}

Analiza este día y responde SOLO JSON sin backticks:
{"status":"verde|amarillo|rojo","titulo":"frase corta del estado del día (max 8 palabras)","resumen":"análisis de 2-3 oraciones: qué está yendo bien, qué mejorar, impacto en LDL/HbA1c","proteina_pct":número_0_a_100,"calorias_pct":número_0_a_100,"ldl_net":"positivo|neutro|negativo","hba1c_net":"positivo|neutro|negativo","tip":"1 consejo accionable concreto para el resto del día"}`}]})});
      const data = await res.json();
      const rawText = data.content.map(b=>b.text||"").join("");
      const parsed = extractJSON(rawText);
      setDayInsight(prev=>({...prev,[dateKey]:parsed}));
      try { localStorage.setItem('insight:'+dateKey, JSON.stringify(parsed)); } catch(_) {}
    } catch(e) {
      setDayInsight(prev=>({...prev,[dateKey]:{status:"amarillo",titulo:"Error al analizar",resumen:"No se pudo generar el análisis. Intenta de nuevo.",tip:""}}));
    }
    setDayInsightLoading(false);
  };

  // ── Weekly data ──
  const weekData = Array.from({length:14},(_,i) => {
    const d = new Date(); d.setDate(d.getDate()-(13-i));
    const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const entries = log[k]||[];
    const grades = entries.map(e=>e.grade||"C");
    const gradeScore = grades.reduce((a,g)=>a+(g==="A"?4:g==="B"?3:g==="C"?2:g==="D"?1:0),0)/(grades.length||1);
    return {date:k.slice(5), key:k, entries:entries.length, gradeAvg:Math.round(gradeScore*25), ...calcMacros(entries)};
  });

  // ── All log entries flattened ──
  const allEntries = Object.entries(log).flatMap(([d,entries])=>entries.map(e=>({...e,date:d})));
  const gradeCounts = {A:0,B:0,C:0,D:0,F:0};
  allEntries.forEach(e=>{ const g=(e.grade||"C")[0]; if(gradeCounts[g]!==undefined) gradeCounts[g]++; });
  const totalEntries = allEntries.length;

  // ── Combined InBody data ──
  // Parse any date format to sortable number
  // Handles: YYYY-MM-DD, YYYY-MM, Mes'YY (legacy)
  const parseInbodyDate = d => {
    if (!d) return 0;
    if (/^\d{4}-\d{2}/.test(d)) {
      const [y,m,day='01'] = d.split('-');
      return parseInt(y)*10000 + parseInt(m)*100 + parseInt(day||'01');
    }
    const months={Ene:1,Feb:2,Mar:3,Abr:4,May:5,Jun:6,Jul:7,Ago:8,Sep:9,Oct:10,Nov:11,Dic:12};
    const m=d.match(/([A-Za-z]+)'(\d+)/);
    if(!m) return 0;
    return (2000+parseInt(m[2]))*10000+(months[m[1]]??1)*100+1;
  };
  // Display: 2021-01-12 → Ene'21 | 2021-01 → Ene'21 | Mes'YY → unchanged
  const fmtD = d => {
    if (!d) return '—';
    const MES=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    if (/^\d{4}-\d{2}/.test(d)) {
      const [y,m] = d.split('-');
      return MES[parseInt(m)-1]+"'"+String(y).slice(2);
    }
    return d; // legacy already formatted
  };
  // Merge DB + custom, deduplicate by date (DB wins), sort chronologically
  const allInbodyRaw = [...bodyMeasurements, ...customInbody];
  const inbodyByDate = new Map();
  allInbodyRaw.forEach(x => {
    if (!inbodyByDate.has(x.d) || x.isSeed) inbodyByDate.set(x.d, x);
  });
  const allInbody = [...inbodyByDate.values()].sort((a,b)=>parseInbodyDate(a.d)-parseInbodyDate(b.d));
  const lastInbody = allInbody[allInbody.length-1] || null;

  // ─── SMART NOTIFICATIONS (all deps available here) ───
  const notifications = loaded ? (() => {
    const notifs = [];
    const today = todayStr();
    const days7 = Array.from({length:7},(_,i)=>{ const d=new Date(); d.setDate(d.getDate()-i); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; });
    const days3 = days7.slice(0,3);

    const lastLoggedDay = days7.find(d=>(log[d]||[]).length>0);
    const daysSinceLog  = lastLoggedDay ? days7.indexOf(lastLoggedDay) : 7;
    if (daysSinceLog >= 2)
      notifs.push({id:"no_log_streak",type:"warn",icon:"📋",msg:`Sin registro hace ${daysSinceLog} día${daysSinceLog>1?"s":""}. El tracking es clave para la recomposición.`,action:"Ir a registrar",tab:"hoy"});

    const protDays = days3.map(d=>{ const e=log[d]||[]; return e.length>0?calcMacros(e).protein:null; }).filter(v=>v!==null);
    if (protDays.length>=2 && protDays.every(p=>p<targets.protein*0.75))
      notifs.push({id:"protein_deficit",type:"warn",icon:"🥩",msg:`Proteína baja ${protDays.length} días seguidos (prom. ${Math.round(protDays.reduce((a,b)=>a+b,0)/protDays.length)}g vs meta ${targets.protein}g). Riesgo pérdida muscular.`,action:"Ver guía",tab:"guia"});

    const recentEntries = days7.flatMap(d=>log[d]||[]);
    const badGrades = recentEntries.filter(e=>e.grade==="D"||e.grade==="F").length;
    const badPct = recentEntries.length>0 ? Math.round(badGrades/recentEntries.length*100) : 0;
    if (badPct>=30 && recentEntries.length>=5)
      notifs.push({id:"bad_grades",type:"alert",icon:"⚠️",msg:`${badPct}% de comidas esta semana con grade D/F. Impacto directo en LDL y HbA1c.`,action:"Ver semana",tab:"semana"});

    const kcalDays = days3.map(d=>{ const e=log[d]||[]; return e.length>0?calcMacros(e).calories:null; }).filter(v=>v!==null);
    if (kcalDays.length>=2 && kcalDays.every(k=>k>targets.calories*1.15))
      notifs.push({id:"calorie_surplus",type:"warn",icon:"🔥",msg:`Superando meta calórica ${kcalDays.length} días seguidos (prom. ${Math.round(kcalDays.reduce((a,b)=>a+b,0)/kcalDays.length)} kcal).`,action:"Ver hoy",tab:"hoy"});

    if (allInbody.length > 0) {
      const lastMeasure = allInbody[allInbody.length-1].d;
      const daysSince = Math.round((new Date(today) - new Date(lastMeasure+"T00:00:00")) / 86400000);
      if (daysSince >= 45)
        notifs.push({id:"inbody_due",type:"info",icon:"📊",msg:`Último InBody hace ${daysSince} días (${lastMeasure}). Ideal medirte cada 6–8 semanas.`,action:"Ver cuerpo",tab:"cuerpo"});
    }

    const posEntries = days3.flatMap(d=>log[d]||[]).filter(e=>e.ldl_impact==="positivo").length;
    const totRecent  = days3.flatMap(d=>log[d]||[]).length;
    if (totRecent>=5 && posEntries/totRecent>=0.6)
      notifs.push({id:"positive_streak",type:"success",icon:"✅",msg:`¡Racha positiva! ${Math.round(posEntries/totRecent*100)}% de comidas recientes son favorables para LDL.`,action:null});

    if (bodyPhotos.length > 0) {
      const lastPhoto = bodyPhotos[bodyPhotos.length-1].date;
      const daysSincePhoto = Math.round((new Date(today) - new Date(lastPhoto+"T00:00:00")) / 86400000);
      if (daysSincePhoto >= 30)
        notifs.push({id:"photo_due",type:"info",icon:"📸",msg:`Última foto de progreso hace ${daysSincePhoto} días. Documenta tu evolución mensualmente.`,action:"Ir a fotos",tab:"cuerpo"});
    }

    return notifs.filter(n=>!dismissedNotifs.includes(n.id));
  })() : [];
  const notifColors = {warn:"#ffb830",alert:"#ff4d4d",info:"#4dc8ff",success:"#3ddc84"};

  // ── Renpho CSV parser ──────────────────────────────────────────
  // Real Renpho CSV format:
  // Date, Time, Weight(kg),BMI,Body Fat(%),Skeletal Muscle(%),Fat-Free Mass(kg),
  // Subcutaneous Fat(%),Visceral Fat,Water(%),Muscle Mass(kg),Bone Mass(kg),
  // Protein (%),BMR(kcal),Metabolic Age,...
  // Date format: DD/M/YY (e.g. 11/3/26 = March 11, 2026)
  const parseRenphoCSV = (text) => {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    // Normalize headers
    const rawHeaders = lines[0].split(",").map(h=>h.trim().toLowerCase()
      .replace(/[()%]/g,"").replace(/\s+/g,"_").replace(/-/g,"_"));
    const findCol = (...keys) => keys.map(k=>rawHeaders.findIndex(h=>h.includes(k))).find(i=>i>=0) ?? -1;

    const iDate   = findCol("date");
    const iTime   = findCol("time");
    const iWeight = findCol("weight");
    const iFat    = findCol("body_fat");
    const iMuscle = findCol("muscle_mass");         // "Muscle Mass(kg)" — actual kg
    const iSkelPct= findCol("skeletal_muscle");      // "Skeletal Muscle(%)" — percentage, fallback
    const iVisceral= findCol("visceral_fat");
    const iBMR    = findCol("bmr");
    const iMetAge = findCol("metabolic_age");
    const iWater  = findCol("water");
    const iBone   = findCol("bone_mass");
    const iBMI    = findCol("bmi");

    const rows = [];
    for (let i=1; i<lines.length; i++) {
      const cols = lines[i].split(",").map(s=>s.trim().replace(/"/g,""));
      if (!cols[iDate] || cols[iDate]==="--") continue;

      // Parse date: DD/M/YY or DD/MM/YY → YYYY-MM-DD-style
      const dateParts = cols[iDate].split("/");
      if (dateParts.length<3) continue;
      let [dd, mm, yy] = dateParts.map(Number);
      if (isNaN(dd)||isNaN(mm)||isNaN(yy)) continue;
      const yyyy = yy < 100 ? 2000 + yy : yy;
      const d = `${yyyy}-${String(mm).padStart(2,"0")}-${String(dd).padStart(2,"0")}`;

      const num = (idx) => {
        if (idx<0 || !cols[idx] || cols[idx]==="--" || cols[idx]==="") return null;
        const v = parseFloat(cols[idx]);
        return isNaN(v) ? null : v;
      };

      const w = num(iWeight);
      if (!w) continue; // weight required

      // Prefer Muscle Mass(kg) over Skeletal Muscle(%)
      const m = num(iMuscle);
      const f = num(iFat);
      const vi = num(iVisceral);
      const bmr = num(iBMR);
      const metAge = num(iMetAge);
      const water = num(iWater);
      const bone = num(iBone);
      const bmi = num(iBMI);

      rows.push({ d, w, m, f, vi, bmr, metAge, water, bone, bmi, note:"Renpho ◀", source:"renpho" });
    }
    return rows.sort((a,b)=>a.d.localeCompare(b.d));
  };

  const handleRenphoFile = (file) => {
    if (!file) return;
    setRenphoLoading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const rows = parseRenphoCSV(ev.target.result);
        if (rows.length===0) { alert("No se encontraron datos válidos. Verifica que sea el CSV de Renpho."); setRenphoLoading(false); return; }
        setRenphoPreview(rows);
        setShowRenphoModal(true);
      } catch(e) { alert("Error leyendo CSV: "+e.message); }
      setRenphoLoading(false);
    };
    reader.readAsText(file);
    renphoRef.current.value="";
  };

  const confirmRenphoImport = async () => {
    if (!renphoPreview || renphoPreview.length===0) return;
    // Merge: avoid duplicate dates
    const existingDates = new Set(allInbody.map(x=>x.d));
    const newRows = renphoPreview.filter(r=>!existingDates.has(r.d));
    if (newRows.length===0) { alert("Todas las fechas ya existen en tu historial."); return; }
    const merged = [...customInbody, ...newRows].sort((a,b)=>a.d.localeCompare(b.d));
    // Save each new row to Supabase
    if (user) {
      for (const row of newRows) {
        insertBodyMeasurement(user.id, row).catch(console.error);
      }
      // Also refresh from DB
      setTimeout(async()=>{
        const fresh = await getBodyMeasurements(user.id).catch(()=>[]);
        setBodyMeasurements(fresh);
      }, 1500);
    }
    saveCustomInbody(merged, null);
    setShowRenphoModal(false);
    setRenphoPreview(null);
    alert(`✓ ${newRows.length} medición(es) Renpho importadas. ${renphoPreview.length-newRows.length} duplicadas omitidas.`);
  };

  const exportData = () => {
    const json = JSON.stringify({log,favs,targets,customInbody,customLabs,bodyPhotosMeta:bodyPhotos.map(p=>({id:p.id,date:p.date,note:p.note}))},null,2);
    setExportJson(json);
  };
  const importData = e => {
    const f=e.target.files[0]; if(!f) return;
    const r=new FileReader();
    r.onload=ev=>{ setImportText(ev.target.result); setImportJson(true); };
    r.readAsText(f);
  };
  const applyImport = (txt) => {
    try {
      let d;
      try {
        // First try: plain parse (handles clean exports)
        d = JSON.parse(txt.trim());
      } catch(_) {
        try {
          // Second try: use extractJSON which handles trailing garbage, backticks, etc.
          d = extractJSON(txt);
        } catch(e2) {
          // Third try: find first { or [ and extract balanced structure manually
          const t = txt.trim();
          const start = Math.min(
            t.indexOf('{') === -1 ? Infinity : t.indexOf('{'),
            t.indexOf('[') === -1 ? Infinity : t.indexOf('[')
          );
          if (start === Infinity) { alert("No se encontró JSON válido en el texto pegado."); return; }
          // Walk to find matching close
          const opener = t[start];
          const closer = opener === '{' ? '}' : ']';
          let depth = 0, inStr = false, esc = false, end = -1;
          for (let i = start; i < t.length; i++) {
            const ch = t[i];
            if (esc) { esc = false; continue; }
            if (ch === '\\' && inStr) { esc = true; continue; }
            if (ch === '"') { inStr = !inStr; continue; }
            if (inStr) continue;
            if (ch === opener) depth++;
            else if (ch === closer) { depth--; if (depth === 0) { end = i; break; } }
          }
          if (end === -1) { alert("JSON incompleto — parece que falta el cierre.\n\nError: " + e2.message); return; }
          try { d = JSON.parse(t.slice(start, end + 1)); }
          catch(e3) { alert("JSON inválido:\n" + e3.message + "\n\nIntenta exportar de nuevo desde CONFIG → EXPORTAR."); return; }
        }
      }

      // Auto-detect format:
      // 1) Full backup: {log:{...}, favs:[...]}
      // 2) Raw log object: keys look like "2026-03-01"
      // 3) Raw favs array: top-level array
      let resolved = {log:null, favs:null, targets:null, customInbody:null, customLabs:null};

      if (d && typeof d === 'object' && !Array.isArray(d)) {
        if (d.log || d.favs || d.targets) {
          // Full backup format
          resolved = d;
        } else {
          // Check if keys look like dates → it's a raw log
          const keys = Object.keys(d);
          const looksLikeLog = keys.length > 0 && keys.every(k => /^\d{4}-\d{2}-\d{2}$/.test(k));
          if (looksLikeLog) resolved.log = d;
        }
      } else if (Array.isArray(d)) {
        // Probably raw favs array
        resolved.favs = d;
      }

      let restored = [];
      if(resolved.log) { saveLog(resolved.log); restored.push("log de comidas"); }
      if(resolved.favs) { saveFavs(resolved.favs); restored.push("favoritos"); }
      if(resolved.targets) { saveTargets(resolved.targets); restored.push("objetivos"); }
      // Only restore customInbody from backup if DB has no measurements (avoids triplication)
      if(resolved.customInbody && bodyMeasurements.length === 0) { saveCustomInbody(resolved.customInbody); restored.push("InBody"); }
      if(resolved.customLabs) { saveCustomLabs(resolved.customLabs); restored.push("labs"); }

      if(restored.length === 0) {
        alert("No se detectó data válida.\n\nFormatos aceptados:\n• Backup completo: {\"log\":{...},\"favs\":[...]}\n• Log crudo: {\"2026-03-01\":[...], ...}\n• Favoritos: [{...},...]");
        return;
      }
      setImportJson(null); setImportText("");
      alert("✓ Restaurado: " + restored.join(", ") + ".\nRecarga la página para ver los datos.");
    } catch(e) { alert("Error inesperado: " + e.message); }
  };

  const latestLab = labResults[labResults.length-1];
  const MODULES = [
    {id:"nutri", icon:"🥗", label:"NUTRICIÓN", tabs:[["hoy","REGISTRO"],["semana","PROGRESO"],["analisis","ANÁLISIS"],["habitos","HÁBITOS"],["guia","GUÍA"]]},
    {id:"cuerpo", icon:"📊", label:"CUERPO",    tabs:[["cuerpo","MEDICIONES"],["labs","LABS"],["score","SCORE"],["proyecciones","PROYECCIONES"],["timeline","TIMELINE"]]},
    {id:"entrena", icon:"⚡", label:"ENTRENA",  tabs:[["entrena","RUTINA"]]},
    {id:"config", icon:"⚙", label:"CONFIG",    tabs:[["config","CONFIG"]]},
  ];
  const activeModule = MODULES.find(m=>m.tabs.some(([k])=>k===tab)) || MODULES[0];



  const fmtCacheAge = ts => {
    void tick; // reactive: re-evaluates every 60s
    if (!ts) return null;
    const mins = Math.round((Date.now()-ts)/60000);
    if (mins <= 1) return 'actualizado ahora';
    if (mins < 60) return `hace ${mins} min`;
    const hrs = Math.floor(mins/60);
    const remMin = mins % 60;
    if (hrs < 24) return remMin > 0 ? `hace ${hrs}h ${remMin}m` : `hace ${hrs}h`;
    const days = Math.floor(hrs/24);
    return `hace ${days}d`;
  };
  const isCacheExpired = ts => !ts || (Date.now()-ts) > 24*60*60*1000;

  if (!loaded) return (
    <div style={{background:"#0c0c0f",minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16}}>
      <div style={{fontFamily:"'Syne',sans-serif",fontSize:52,fontWeight:800,letterSpacing:"-.01em",color:"#a8ff3e"}}>METABOLIC HEALTH OS</div>
      <div style={{display:"flex",gap:4}} className="dots">
        <span style={{color:"#a8ff3e"}}/><span style={{color:"#a8ff3e"}}/><span style={{color:"#a8ff3e"}}/>
      </div>
    </div>
  );

  return (
    <>
    <Head>
      <title>Metabolic Health OS</title>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Instrument+Sans:ital,wght@0,400;0,500;0,600;1,400&family=JetBrains+Mono:wght@400;500&family=Bebas+Neue&display=swap" rel="stylesheet" />
    </Head>
    <div style={{background:"#0c0c0f",minHeight:"100vh",color:"#e8e8f0"}}>
      <style>{CSS}</style>

      {/* ── HEADER ── */}
      <div className="app-header">
        <div style={{position:"absolute",top:"-80px",right:"-60px",width:"420px",height:"420px",background:"radial-gradient(circle,rgba(168,255,62,.05),transparent 65%)",pointerEvents:"none"}}/>
        <div>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"10px",letterSpacing:".28em",textTransform:"uppercase",color:"#a8ff3e",marginBottom:10}}>
            {`Metabolic Health OS · ${new Date().toLocaleDateString("es-CR",{month:"short",year:"numeric"})}`}
          </div>
          <div style={{fontFamily:"'Syne',sans-serif",fontSize:"clamp(20px,3.5vw,44px)",fontWeight:800,lineHeight:.95,letterSpacing:"-.01em"}}>
            {(()=>{
              const parts = (userProfile.name||"Usuario").toUpperCase().trim().split(" ");
              if(parts.length===1) return <span style={{color:"#a8ff3e"}}>{parts[0]}</span>;
              const last = parts.pop();
              return <>{parts.join(" ")} <span style={{color:"#a8ff3e"}}>{last}</span></>;
            })()}
          </div>
          <div style={{display:"flex",gap:24,marginTop:14,flexWrap:"wrap"}}>
            {(()=>{
              const li = allInbody[allInbody.length-1];
              const tmb = li ? Math.round(370 + 21.6*li.m) : null;
              const stats = li ? [
                [li.w+" kg","Peso"],
                [li.m+" kg","Músculo"],
                [li.f+"%","Grasa"],
                [tmb?tmb.toLocaleString():"—","TMB kcal"],
              ] : [];
              return stats.map(([v,l])=>(
                <div key={l} style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"10px",color:"#8888a8"}}>
                  <strong style={{display:"block",fontSize:"14px",color:"#e8e8f0",marginBottom:1,fontFamily:"'Syne',sans-serif",fontWeight:700}}>{v}</strong>{l}
                </div>
              ));
            })()}
          </div>
        </div>
        {/* Logout */}
        <button onClick={async()=>{await supabase.auth.signOut();router.replace("/auth");}}
          style={{position:"absolute",top:16,right:20,background:"none",border:"1px solid #2a2a38",
          borderRadius:3,color:"#44445a",fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",
          letterSpacing:".12em",padding:"4px 10px",cursor:"pointer"}}>
          SALIR
        </button>
        {notifications.length > 0 && (
          <div style={{borderTop:"1px solid #1e1e2a",width:"100%"}}>
            <div className="notif-pad" style={{padding:"10px 44px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",userSelect:"none"}}
              onClick={()=>setShowNotifs(v=>!v)}>
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",letterSpacing:".15em",color:"#ffb830"}}>
                🔔 {notifications.length} AVISO{notifications.length>1?"S":""} INTELIGENTE{notifications.length>1?"S":""}
              </span>
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#44445a"}}>{showNotifs?"▲":"▼"}</span>
            </div>
            {showNotifs && (
              <div className="notif-inner fade-in" style={{padding:"0 44px 14px",display:"flex",flexDirection:"column",gap:8}}>
                {notifications.map(n=>(
                  <div key={n.id} style={{
                    display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,
                    background:n.type==="success"?"rgba(61,220,132,.04)":n.type==="alert"?"rgba(255,77,77,.04)":"rgba(255,184,48,.04)",
                    border:`1px solid ${n.type==="success"?"rgba(61,220,132,.2)":n.type==="alert"?"rgba(255,77,77,.15)":"rgba(255,184,48,.15)"}`,
                    borderRadius:3,padding:"10px 14px",
                  }}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:4}}>
                        <span style={{fontSize:14}}>{n.icon}</span>
                        <span style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,
                          color:n.type==="success"?"#3ddc84":n.type==="alert"?"#ff4d4d":"#ffb830"
                        }}>{n.type==="success"?"Racha positiva":n.type==="info"?"Recordatorio":"Alerta"}</span>
                      </div>
                      <p style={{fontSize:11,color:"#8888a8",lineHeight:1.5,margin:0}}>{n.msg}</p>
                    </div>
                    <div style={{display:"flex",gap:6,flexShrink:0,alignItems:"center",marginTop:2}}>
                      {n.action && (
                        <button className="btn-sm" style={{fontSize:"8px",padding:"3px 8px"}}
                          onClick={()=>{setTab(n.tab);setShowNotifs(false);}}>
                          {n.action}
                        </button>
                      )}
                      <button style={{background:"none",border:"none",color:"#44445a",cursor:"pointer",fontSize:14,lineHeight:1,padding:"2px 4px"}}
                        onClick={()=>dismissNotif(n.id)}>×</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── METABOLIC SCORE STRIP ── */}
      {(()=>{
        const ms = calcMetabolicScore(labResults, allInbody, log, targets);
        if (!ms) return null;
        const scoreColor = ms.score >= 80 ? "#3ddc84" : ms.score >= 60 ? "#ffb830" : "#ff4d4d";
        // ── Compute metAge for strip ──
        const _lab  = labResults[labResults.length-1] || null;
        const _body = allInbody[allInbody.length-1]   || null;
        const REAL_AGE_S = userProfile.dob ? Math.floor((Date.now()-new Date(userProfile.dob).getTime())/(1000*60*60*24*365.25)) : 39;
        const NORMS_S = {
          ldl:    {ages:[25,32,42,52,62],vals:[98,115,125,128,126],lbetter:true,  w:2.5},
          hba1c:  {ages:[25,32,42,52,62],vals:[5.2,5.3,5.45,5.65,5.85],lbetter:true, w:2.5},
          fat_pct:{ages:[25,32,42,52,62],vals:[18,21,24,26,28],lbetter:true,  w:2},
          tg:     {ages:[25,32,42,52,62],vals:[95,115,130,140,138],lbetter:true,  w:1},
          hdl:    {ages:[25,32,42,52,62],vals:[50,49,49,50,52],lbetter:false, w:1},
        };
        function interpAgeS(norm, val) {
          const {ages,vals,lbetter}=norm;
          if(lbetter){if(val<=vals[0])return ages[0]-(vals[0]-val)*1.5;if(val>=vals[vals.length-1])return ages[ages.length-1]+(val-vals[vals.length-1])*1.5;}
          else{if(val>=vals[0])return ages[0]-(val-vals[0])*1.5;if(val<=vals[vals.length-1])return ages[ages.length-1]+(vals[vals.length-1]-val)*1.5;}
          for(let i=0;i<ages.length-1;i++){const a0=ages[i],a1=ages[i+1],v0=vals[i],v1=vals[i+1];const inR=lbetter?(val>=v0&&val<=v1):(val<=v0&&val>=v1);if(inR){const t=(val-v0)/(v1-v0);return a0+t*(a1-a0);}}
          return REAL_AGE_S;
        }
        const _sitems=[];
        if(_lab?.ldl)   _sitems.push({...NORMS_S.ldl,   val:_lab.ldl,   age:interpAgeS(NORMS_S.ldl,   _lab.ldl)});
        if(_lab?.hba1c) _sitems.push({...NORMS_S.hba1c, val:_lab.hba1c, age:interpAgeS(NORMS_S.hba1c, _lab.hba1c)});
        if(_body?.f)    _sitems.push({...NORMS_S.fat_pct,val:_body.f,    age:interpAgeS(NORMS_S.fat_pct,_body.f)});
        if(_lab?.tg)    _sitems.push({...NORMS_S.tg,    val:_lab.tg,    age:interpAgeS(NORMS_S.tg,    _lab.tg)});
        if(_lab?.hdl)   _sitems.push({...NORMS_S.hdl,   val:_lab.hdl,   age:interpAgeS(NORMS_S.hdl,   _lab.hdl)});
        const metAgeS = _sitems.length ? Math.round(Math.max(18,Math.min(75,_sitems.reduce((s,x)=>s+x.age*x.w,0)/_sitems.reduce((s,x)=>s+x.w,0)))) : null;
        const metAgeDelta = metAgeS !== null ? metAgeS - REAL_AGE_S : null;
        const metAgeCol = metAgeDelta===null?"#44445a":metAgeDelta<=-3?"#3ddc84":metAgeDelta<=2?"#ffb830":"#ff4d4d";
        return (
          <div onClick={()=>setTab("score")} style={{
            display:"flex",alignItems:"center",gap:0,
            background:"#0e0e14",borderBottom:"1px solid #2a2a38",
            cursor:"pointer",overflowX:"auto",scrollbarWidth:"none",
          }}>
            {/* Score badge */}
            <div style={{
              display:"flex",alignItems:"center",gap:10,
              padding:"10px 20px",borderRight:"1px solid #2a2a38",flexShrink:0,
            }}>
              <div style={{
                width:36,height:36,borderRadius:"50%",flexShrink:0,
                background:`conic-gradient(${scoreColor} ${ms.score*3.6}deg, #1a1a22 0deg)`,
                display:"flex",alignItems:"center",justifyContent:"center",
              }}>
                <div style={{
                  width:26,height:26,borderRadius:"50%",background:"#0e0e14",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:10,color:scoreColor,
                }}>{ms.score}</div>
              </div>
              <div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:"#44445a",letterSpacing:".15em"}}>SCORE</div>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:12,color:scoreColor}}>
                  {ms.score>=80?"ÓPTIMO":ms.score>=65?"BUENO":ms.score>=50?"MODERADO":"ATENCIÓN"}
                </div>
              </div>
            </div>
            {/* Indicators */}
            {ms.indicators.map((ind,i)=>(
              <div key={i} style={{
                padding:"10px 16px",borderRight:"1px solid #1a1a22",flexShrink:0,
                display:"flex",flexDirection:"column",gap:2,
              }}>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:"#44445a",letterSpacing:".1em",whiteSpace:"nowrap"}}>{ind.label}</div>
                <div style={{display:"flex",alignItems:"center",gap:5}}>
                  <span style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,
                    color:ind.status==="ok"?"#3ddc84":ind.status==="warn"?"#ffb830":"#ff4d4d",
                    whiteSpace:"nowrap"
                  }}>{ind.value}</span>
                  <span style={{fontSize:10}}>{ind.status==="ok"?"✓":ind.status==="warn"?"↑":"⚠"}</span>
                </div>
              </div>
            ))}
            {metAgeS !== null && (
              <div style={{
                padding:"10px 16px",borderRight:"1px solid #1a1a22",flexShrink:0,
                display:"flex",flexDirection:"column",gap:2,
              }}>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:"#44445a",letterSpacing:".1em",whiteSpace:"nowrap"}}>EDAD METAB</div>
                <div style={{display:"flex",alignItems:"center",gap:5}}>
                  <span style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,color:metAgeCol,whiteSpace:"nowrap"}}>{metAgeS} años</span>
                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:metAgeCol}}>
                    {metAgeDelta<=-3?`▼${Math.abs(metAgeDelta)}`:metAgeDelta<=2?`→`:` ▲${metAgeDelta}`}
                  </span>
                </div>
              </div>
            )}
            <div style={{padding:"10px 14px",flexShrink:0,marginLeft:"auto"}}>
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:"#44445a"}}>VER DETALLE →</span>
            </div>
          </div>
        );
      })()}

      {/* ── MODULE NAV (top / desktop) ── */}
      <div className="desktop-module-nav" style={{display:"flex",borderBottom:"1px solid #2a2a38",background:"#0c0c0f",position:"sticky",top:0,zIndex:50,overflowX:"auto",scrollbarWidth:"none"}}>
        {MODULES.map(m=>(
          <button key={m.id} onClick={()=>setTab(m.tabs[0][0])} style={{
            padding:"11px 20px",fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",letterSpacing:".18em",
            textTransform:"uppercase",color:activeModule.id===m.id?"#a8ff3e":"#44445a",background:"none",border:"none",
            borderBottom:activeModule.id===m.id?"2px solid #a8ff3e":"2px solid transparent",
            cursor:"pointer",whiteSpace:"nowrap",transition:"all .2s",marginBottom:-1,display:"flex",alignItems:"center",gap:6,flexDirection:"column",paddingBottom:8,
          }}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:13}}>{m.icon}</span>{m.label}
            </div>
            {m.id==="nutri" && todayLog.length > 0 && (
              <div style={{display:"flex",gap:5,marginTop:1}}>
                <span style={{
                  fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",
                  background:todayKcalPct>=90?"rgba(61,220,132,.15)":todayKcalPct>=60?"rgba(255,184,48,.12)":"rgba(255,77,77,.1)",
                  color:todayKcalPct>=90?"#3ddc84":todayKcalPct>=60?"#ffb830":"#ff4d4d",
                  borderRadius:2,padding:"1px 5px",letterSpacing:".05em",
                }}>{todayMacros.calories} kcal</span>
                <span style={{
                  fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",
                  background:todayProtPct>=85?"rgba(77,200,255,.12)":"rgba(77,200,255,.05)",
                  color:todayProtPct>=85?"#4dc8ff":"#44445a",
                  borderRadius:2,padding:"1px 5px",letterSpacing:".05em",
                }}>{todayMacros.protein}g P</span>
                {todayInsight && (
                  <span style={{
                    fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",
                    background:todayInsight.status==="verde"?"rgba(61,220,132,.15)":todayInsight.status==="rojo"?"rgba(255,77,77,.1)":"rgba(255,184,48,.1)",
                    color:todayInsight.status==="verde"?"#3ddc84":todayInsight.status==="rojo"?"#ff4d4d":"#ffb830",
                    borderRadius:2,padding:"1px 5px",
                  }}>{todayInsight.status==="verde"?"✓ ok":todayInsight.status==="rojo"?"⚠ alerta":"· revisar"}</span>
                )}
              </div>
            )}
            {m.id==="cuerpo" && (
              <div style={{display:"flex",gap:5,marginTop:1}}>
                {lastInbody && <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:"#a8ff3e",background:"rgba(168,255,62,.08)",borderRadius:2,padding:"1px 5px"}}>{lastInbody.w} kg</span>}
                {lastInbody && <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:"#ff7a4d",background:"rgba(255,122,77,.08)",borderRadius:2,padding:"1px 5px"}}>{lastInbody.f}%</span>}
              </div>
            )}
            {m.id==="entrena" && (
              <div style={{display:"flex",gap:5,marginTop:1}}>
                <span style={{
                  fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",
                  background:isTrainingDay?"rgba(168,255,62,.1)":"rgba(68,68,90,.2)",
                  color:isTrainingDay?"#a8ff3e":"#44445a",
                  borderRadius:2,padding:"1px 5px",
                }}>{isTrainingDay?"⚡ "+todayTraining:"· DESCANSO"}</span>
              </div>
            )}
          </button>
        ))}
      </div>
      {/* ── SUB-TABS ── */}
      {activeModule.tabs.length > 1 && (
        <div className="sub-tabs" style={{display:"flex",borderBottom:"1px solid #2a2a38",background:"#131318",overflowX:"auto",scrollbarWidth:"none"}}>
          {activeModule.tabs.map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)} style={{
              padding:"9px 16px",fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",letterSpacing:".15em",
              textTransform:"uppercase",color:tab===k?"#e8e8f0":"#44445a",background:"none",border:"none",
              borderBottom:tab===k?"2px solid rgba(168,255,62,.5)":"2px solid transparent",
              cursor:"pointer",whiteSpace:"nowrap",transition:"all .2s",marginBottom:-1,
              display:"flex",alignItems:"center",gap:5,
            }}>
              {l}
              {k==="hoy" && todayLog.length>0 && <span style={{background:"rgba(168,255,62,.15)",color:"#a8ff3e",borderRadius:"2px",padding:"0px 4px",fontSize:"8px",fontWeight:700}}>{todayLog.length}</span>}
            </button>
          ))}
        </div>
      )}

      {/* ── TAB CONTENT ── */}
      <div className="tab-content" style={{padding:"24px 44px 80px",maxWidth:1200,boxSizing:"border-box"}}>

        {/* ══ HOY ══ */}
        {tab==="hoy" && (
          <div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"#131318",border:"1px solid #2a2a38",borderRadius:4,padding:"10px 16px",marginBottom:14}}>
              <button className="btn-sm" onClick={()=>navDay(-1)}>← ANT</button>
              <div style={{textAlign:"center"}}>
                <div style={{fontFamily:"'Syne',sans-serif",fontSize:22,fontWeight:700,letterSpacing:"-.01em"}}>{fmtDate(selDate)}</div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#44445a"}}>{selDate}</div>
              </div>
              <button className="btn-sm" onClick={()=>navDay(1)} disabled={isToday} style={{opacity:isToday?0.4:1}}>SIG →</button>
            </div>

            {/* Calendar strip */}
            <div style={{marginBottom:14}}>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#44445a",letterSpacing:".1em",marginBottom:6}}>DÍAS CON REGISTRO</div>
              <div className="cal-strip">
                {Array.from({length:14},(_,i)=>{
                  const d=new Date(); d.setDate(d.getDate()-(13-i));
                  const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
                  const cnt=(log[k]||[]).length;
                  const isSelected=k===selDate;
                  return (
                    <div key={k} className="cal-day" onClick={()=>setSelDate(k)} style={{
                      background:isSelected?"#a8ff3e":cnt>0?"rgba(168,255,62,.12)":"#131318",
                      color:isSelected?"#0c0c0f":cnt>0?"#a8ff3e":"#44445a",
                      border:`1px solid ${isSelected?"#a8ff3e":cnt>0?"rgba(168,255,62,.3)":"#2a2a38"}`,
                      fontWeight:isSelected?700:400,
                    }} title={`${k}: ${cnt} comidas`}>
                      {d.getDate()}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Day insight card — shown first when there are entries */}
            {dayLog.length > 0 && (() => {
              const ins = dayInsight[selDate];
              const borderC = ins?.status==="verde"?"#3ddc84":ins?.status==="rojo"?"#ff4d4d":"#ffb830";
              const bgC = ins?.status==="verde"?"rgba(61,220,132,.04)":ins?.status==="rojo"?"rgba(255,77,77,.04)":"rgba(255,184,48,.04)";
              return (
                <div className="card fade-in" style={{borderLeft:`3px solid ${borderC}`,background:bgC,borderRadius:"0 4px 4px 0",marginBottom:14,padding:"14px 16px"}}>
                  {ins ? (
                    <div>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                        <div>
                          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:borderC,letterSpacing:".15em",textTransform:"uppercase",marginBottom:4}}>
                            {ins.status==="verde"?"✅ DÍA EN BUEN CAMINO":ins.status==="rojo"?"🔴 DÍA CON ALERTAS":"⚠️ DÍA MEJORABLE"}
                          </div>
                          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,marginBottom:6}}>{ins.titulo}</div>
                        </div>
                        <button className="btn-sm" onClick={()=>analyzeDayInsight(selDate,dayLog)} disabled={dayInsightLoading} style={{flexShrink:0,marginLeft:8}}>
                          {dayInsightLoading?<span className="dots"><span/><span/><span/></span>:"↻"}
                        </button>
                      </div>
                      <p style={{fontSize:12,color:"#8888a8",lineHeight:1.6,marginBottom:10}}>{ins.resumen}</p>
                      <div style={{display:"flex",gap:12,marginBottom:10,flexWrap:"wrap"}}>
                        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"10px"}}>
                          <span style={{color:"#8888a8"}}>PROTEÍNA </span>
                          <span style={{color:ins.proteina_pct>=85?"#3ddc84":ins.proteina_pct>=60?"#ffb830":"#ff4d4d",fontWeight:700}}>{ins.proteina_pct}%</span>
                        </div>
                        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"10px"}}>
                          <span style={{color:"#8888a8"}}>KCAL </span>
                          <span style={{color:ins.calorias_pct>=85?"#3ddc84":ins.calorias_pct>=60?"#ffb830":"#ff4d4d",fontWeight:700}}>{ins.calorias_pct}%</span>
                        </div>
                        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"10px"}}>
                          <span style={{color:"#8888a8"}}>LDL </span>
                          <span style={{color:ins.ldl_net==="positivo"?"#3ddc84":ins.ldl_net==="negativo"?"#ff4d4d":"#8888a8",fontWeight:700}}>{ins.ldl_net==="positivo"?"↓":ins.ldl_net==="negativo"?"↑":"→"} {ins.ldl_net}</span>
                        </div>
                        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"10px"}}>
                          <span style={{color:"#8888a8"}}>HbA1c </span>
                          <span style={{color:ins.hba1c_net==="positivo"?"#3ddc84":ins.hba1c_net==="negativo"?"#ff4d4d":"#8888a8",fontWeight:700}}>{ins.hba1c_net==="positivo"?"↓":ins.hba1c_net==="negativo"?"↑":"→"} {ins.hba1c_net}</span>
                        </div>
                      </div>
                      {ins.tip && <div style={{fontSize:12,color:"#4dc8ff",borderTop:"1px solid rgba(42,42,56,.5)",paddingTop:8}}>💡 <strong style={{color:"#e8e8f0"}}>Tip:</strong> {ins.tip}</div>}
                    </div>
                  ) : (
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div>
                        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#44445a",letterSpacing:".15em",textTransform:"uppercase",marginBottom:3}}>RESUMEN DEL DÍA CON IA</div>
                        <div style={{fontSize:12,color:"#8888a8"}}>
                          {dayInsightLoading ? <span>Analizando lo registrado hoy… <span className="dots"><span/><span/><span/></span></span> : "¿Cómo va el día según lo registrado?"}
                        </div>
                      </div>
                      <button className="btn" onClick={()=>analyzeDayInsight(selDate,dayLog)} disabled={dayInsightLoading} style={{flexShrink:0,marginLeft:12}}>
                        {dayInsightLoading?<span className="dots"><span/><span/><span/></span>:"🧠 ANALIZAR"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="g4" style={{marginBottom:14}}>
              {MACRO_KEYS.map(k => {
                const pct = Math.min(100, Math.round(totals[k]/targets[k]*100));
                return (
                  <div key={k} className="card" style={{borderTop:`2px solid ${MACRO_CFG[k].color}`}}>
                    <div className="lbl">{MACRO_CFG[k].label}</div>
                    <div style={{fontFamily:"'Syne',sans-serif",fontSize:34,fontWeight:800,color:MACRO_CFG[k].color,lineHeight:1}}>
                      {totals[k]}<span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:"#44445a",marginLeft:2}}>{MACRO_CFG[k].unit}</span>
                    </div>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#44445a",marginTop:2}}>/ {targets[k]} {MACRO_CFG[k].unit}</div>
                    <div style={{height:4,background:"#2a2a38",borderRadius:2,marginTop:8,overflow:"hidden"}}>
                      <div style={{width:`${pct}%`,height:"100%",background:MACRO_CFG[k].color,borderRadius:2,transition:"width .4s"}}/>
                    </div>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:pct>=90?"#3ddc84":pct>=60?"#ffb830":"#ff4d4d",marginTop:4}}>{pct}%</div>
                  </div>
                );
              })}
            </div>


            <button className="btn" style={{width:"100%",marginBottom:12,padding:"11px"}}
              onClick={()=>{ setShowAdd(!showAdd); if(showAdd) resetAdd(); }}>
              {showAdd ? "✕ CANCELAR" : `+ AGREGAR${!isToday?" A "+fmtDate(selDate).toUpperCase():""}`}
            </button>

            {showAdd && (
              <div className="card fade-in" style={{marginBottom:14}}>
                {/* ── Tipo de día + Tiempo de comida ── */}
                <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
                  <div style={{flex:"1 1 140px"}}>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#44445a",letterSpacing:".1em",marginBottom:5}}>TIPO DE DÍA</div>
                    <div style={{display:"flex",gap:4}}>
                      {[["entreno","⚡ ENTRENO","#a8ff3e"],["descanso","😴 DESCANSO","#4dc8ff"]].map(([v,l,c])=>(
                        <button key={v} onClick={()=>setSelDayType(v)} style={{
                          flex:1,padding:"6px 4px",border:"none",borderRadius:3,cursor:"pointer",
                          background:selDayType===v?`${c}22`:"#1a1a22",
                          color:selDayType===v?c:"#44445a",
                          fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",letterSpacing:".08em",
                          borderBottom:selDayType===v?`2px solid ${c}`:"2px solid transparent",
                          fontWeight:selDayType===v?700:400,
                        }}>{l}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{flex:"2 1 200px"}}>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#44445a",letterSpacing:".1em",marginBottom:5}}>TIEMPO DE COMIDA</div>
                    <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
                      {["Desayuno","Snack Mañana","Almuerzo","Post-Entreno","Cena","Merienda"].map(m=>(
                        <button key={m} onClick={()=>setSelMeal(m)} style={{
                          padding:"4px 8px",border:"none",borderRadius:3,cursor:"pointer",
                          background:selMeal===m?"rgba(168,255,62,.15)":"#1a1a22",
                          color:selMeal===m?"#a8ff3e":"#44445a",
                          fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",letterSpacing:".06em",
                          borderBottom:selMeal===m?"2px solid #a8ff3e":"2px solid transparent",
                          fontWeight:selMeal===m?700:400,
                        }}>{m}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <div style={{height:1,background:"#2a2a38",marginBottom:12}}/>
                <div style={{display:"flex",gap:6,marginBottom:14}}>
                  {[["ai","🤖 IA"],["off","🔍 Buscar"],["manual","✏ Manual"],["fav","⭐ Favs"]].map(([m,l])=>(
                    <button key={m} onClick={()=>setAddMode(m)} style={{
                      flex:1,padding:"7px 4px",border:"none",borderRadius:3,cursor:"pointer",
                      background:addMode===m?"#a8ff3e":"#1a1a22",
                      color:addMode===m?"#0c0c0f":"#8888a8",
                      fontFamily:"'JetBrains Mono',monospace",fontSize:"10px",letterSpacing:".1em",
                      fontWeight:addMode===m?700:400,
                    }}>{l}</button>
                  ))}
                </div>

                {addMode==="ai" && (
                  <div>
                    <textarea value={aiInput} onChange={e=>setAiInput(e.target.value)}
                      placeholder="Describe el alimento... ej: 2 huevos revueltos, arroz integral 100g, ensalada, aguacate"
                      rows={3} className="inp" style={{resize:"vertical",marginBottom:8}}/>
                    <input ref={imgRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleImg}/>
                    <div className={`photo-zone${aiImage?" has-img":dragOver?" drag":""}`}
                      onClick={()=>imgRef.current?.click()}
                      onDragOver={e=>{e.preventDefault();setDragOver(true);}}
                      onDragLeave={()=>setDragOver(false)}
                      onDrop={handleDrop}
                      style={{cursor:"pointer"}}>
                      {aiImage
                        ? <img src={aiImage} alt="" style={{width:"100%",maxHeight:220,objectFit:"contain",background:"#0c0c0f",borderRadius:3,display:"block"}}/>
                        : <><div style={{fontSize:28,marginBottom:6}}>📷</div>
                            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"10px",color:"#8888a8",letterSpacing:".1em"}}>FOTO O GALERÍA</div>
                            <div style={{fontSize:12,color:"#44445a",marginTop:4}}>toca para seleccionar · arrastrá en desktop</div></>
                      }
                    </div>
                    {aiImage && <button className="btn-sm" style={{width:"100%",marginBottom:8}} onClick={e=>{e.stopPropagation();setAiImage(null);setAiB64(null);}}>✕ QUITAR FOTO</button>}
                    <button className="btn" style={{width:"100%"}} onClick={analyzeAI} disabled={aiLoading||(!aiInput&&!aiB64)}>
                      {aiLoading?<span>ANALIZANDO <span className="dots"><span/><span/><span/></span></span>:"🔍 ANALIZAR CON IA"}
                    </button>
                    {aiResult?.error && <div style={{fontFamily:"'JetBrains Mono',monospace",color:"#ff4d4d",fontSize:11,marginTop:8}}>{aiResult.error}</div>}
                    {aiResult && !aiResult.error && (
                      <div style={{background:"#1a1a22",border:"1px solid #2a2a38",borderRadius:4,padding:14,marginTop:10}} className="fade-in">
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                          <div style={{flex:1}}>
                            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,marginBottom:5}}>{aiResult.name}</div>
                            {aiResult.meal && <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",background:"#131318",color:"#a8ff3e",borderRadius:2,padding:"2px 8px"}}>{aiResult.meal}</span>}
                          </div>
                          <div style={{textAlign:"center",marginLeft:10,flexShrink:0}}>
                            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:38,color:gradeColor(aiResult.grade),lineHeight:1}}>{aiResult.grade}</div>
                            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#44445a"}}>{aiResult.score}/10</div>
                          </div>
                        </div>
                        <div className="g4" style={{marginBottom:10}}>
                          {MACRO_KEYS.map(k=>(
                            <div key={k} style={{background:"#131318",borderRadius:3,padding:"7px 5px",textAlign:"center"}}>
                              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:22,color:MACRO_CFG[k].color}}>{aiResult[k]}</div>
                              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:"#44445a"}}>{MACRO_CFG[k].unit}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap"}}>
                          {aiResult.ldl_impact && <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:impactColor(aiResult.ldl_impact),background:"#131318",borderRadius:2,padding:"2px 8px"}}>LDL {impactArrow(aiResult.ldl_impact)} {aiResult.ldl_impact}</span>}
                          {aiResult.hba1c_impact && <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:impactColor(aiResult.hba1c_impact),background:"#131318",borderRadius:2,padding:"2px 8px"}}>HbA1c {impactArrow(aiResult.hba1c_impact)} {aiResult.hba1c_impact}</span>}
                        </div>
                        {aiResult.notes && <div style={{fontSize:12,color:"#3ddc84",marginBottom:6}}>💡 {aiResult.notes}</div>}
                        {aiResult.alerta && <div style={{fontSize:12,color:"#ffb830"}}>⚠️ {aiResult.alerta}</div>}
                        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#3ddc84",marginTop:10,textAlign:"center",letterSpacing:".1em"}}>✓ AGREGADO AL LOG</div>
                      </div>
                    )}
                  </div>
                )}

                {addMode==="off" && (
                  <div>
                    {/* Search bar */}
                    <div style={{display:"flex",gap:6,marginBottom:10}}>
                      <input
                        className="inp" style={{flex:1}}
                        placeholder="ej: chicken breast, avocado, arroz integral..."
                        value={offQuery}
                        onChange={e=>setOffQuery(e.target.value)}
                        onKeyDown={e=>e.key==="Enter"&&searchOFF(offQuery)}
                      />
                      <button className="btn" style={{padding:"0 14px",flexShrink:0}} onClick={()=>searchOFF(offQuery)} disabled={offLoading}>
                        {offLoading ? <span className="dots"><span/><span/><span/></span> : "🔍"}
                      </button>
                    </div>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:"#44445a",marginBottom:10,letterSpacing:".06em"}}>
                      FUENTE: OPEN FOOD FACTS · BASE DE DATOS COLABORATIVA GLOBAL
                    </div>

                    {/* Results list */}
                    {offSearched && !offLoading && offResults.length===0 && (
                      <div style={{textAlign:"center",padding:"20px 0",fontFamily:"'JetBrains Mono',monospace",fontSize:"10px",color:"#44445a"}}>
                        SIN RESULTADOS — probá en inglés o cambiá términos
                      </div>
                    )}
                    {!offSelected && offResults.length>0 && (
                      <div style={{maxHeight:280,overflowY:"auto",display:"flex",flexDirection:"column",gap:6}}>
                        {offResults.map((p,i)=>(
                          <div key={i} onClick={()=>{setOffSelected(p);setOffGrams(100);}}
                            style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",
                              background:"#1a1a22",border:"1px solid #2a2a38",borderRadius:4,cursor:"pointer",
                              transition:"border-color .12s"}}
                            onMouseEnter={e=>e.currentTarget.style.borderColor="#a8ff3e44"}
                            onMouseLeave={e=>e.currentTarget.style.borderColor="#2a2a38"}>
                            {p.img && <img src={p.img} alt="" style={{width:36,height:36,objectFit:"contain",borderRadius:3,background:"#131318",flexShrink:0}}/>}
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:13,
                                overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</div>
                              {p.brand && <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:"#44445a",marginTop:1}}>{p.brand}</div>}
                            </div>
                            <div style={{flexShrink:0,textAlign:"right"}}>
                              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:"#a8ff3e"}}>{p.cal100}</div>
                              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:"#44445a"}}>kcal/100g</div>
                            </div>
                            <div style={{flexShrink:0,display:"flex",flexDirection:"column",gap:1,textAlign:"right",minWidth:52}}>
                              <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#4dc8ff"}}>P {p.prot100}g</span>
                              <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#ffb830"}}>C {p.carb100}g</span>
                              <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#ff7a4d"}}>G {p.fat100}g</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Product detail + grams selector */}
                    {offSelected && (
                      <div className="fade-in" style={{background:"#1a1a22",border:"1px solid #a8ff3e44",borderRadius:4,padding:14}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,marginBottom:2}}>{offSelected.name}</div>
                            {offSelected.brand && <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:"#44445a"}}>{offSelected.brand}</div>}
                          </div>
                          <button onClick={()=>setOffSelected(null)} style={{background:"none",border:"none",color:"#44445a",cursor:"pointer",fontSize:16,lineHeight:1,padding:2}}>✕</button>
                        </div>

                        {/* Grams input */}
                        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                          <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#8888a8",letterSpacing:".08em"}}>CANTIDAD</span>
                          <div style={{display:"flex",alignItems:"center",gap:6,flex:1}}>
                            <button onClick={()=>setOffGrams(g=>Math.max(5,g-10))}
                              style={{width:28,height:28,borderRadius:3,border:"none",background:"#2a2a38",color:"#e8e8f0",cursor:"pointer",fontSize:16,lineHeight:1}}>−</button>
                            <input type="number" value={offGrams} min={1} max={2000}
                              onChange={e=>setOffGrams(Math.max(1,Number(e.target.value)||100))}
                              className="inp" style={{width:72,textAlign:"center",padding:"5px 8px"}}/>
                            <button onClick={()=>setOffGrams(g=>Math.min(2000,g+10))}
                              style={{width:28,height:28,borderRadius:3,border:"none",background:"#2a2a38",color:"#e8e8f0",cursor:"pointer",fontSize:16,lineHeight:1}}>+</button>
                            <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#44445a"}}>g</span>
                          </div>
                          {offSelected.serving && (
                            <button onClick={()=>{const n=parseFloat(offSelected.serving);if(n>0)setOffGrams(Math.round(n));}}
                              style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",padding:"4px 8px",borderRadius:3,border:"1px solid #2a2a38",background:"transparent",color:"#8888a8",cursor:"pointer"}}>
                              1 porción ({offSelected.serving})
                            </button>
                          )}
                        </div>

                        {/* Macro preview scaled to grams */}
                        {(()=>{
                          const g = offGrams/100;
                          const cal = Math.round(offSelected.cal100*g);
                          const prot = (offSelected.prot100*g).toFixed(1);
                          const carb = (offSelected.carb100*g).toFixed(1);
                          const fat = (offSelected.fat100*g).toFixed(1);
                          const fiber = offSelected.fiber100 ? (offSelected.fiber100*g).toFixed(1) : null;
                          return (
                            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:12}}>
                              {[[cal,"kcal","#a8ff3e"],[prot+"g","Proteína","#4dc8ff"],[carb+"g","Carbos","#ffb830"],[fat+"g","Grasa","#ff7a4d"]].map(([v,l,c])=>(
                                <div key={l} style={{background:"#131318",borderRadius:3,padding:"8px 6px",textAlign:"center",borderTop:`2px solid ${c}`}}>
                                  <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,color:c}}>{v}</div>
                                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:"#44445a",marginTop:2}}>{l}</div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                        {offSelected.fiber100>0 && (
                          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#3ddc84",marginBottom:10}}>
                            🌿 Fibra: {(offSelected.fiber100*offGrams/100).toFixed(1)}g
                          </div>
                        )}
                        <button className="btn" style={{width:"100%"}} onClick={addOFF}>
                          ✓ AGREGAR {offGrams}g A REGISTRO
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {addMode==="manual" && (
                  <div>
                    <input placeholder="Nombre del alimento" value={manForm.name}
                      onChange={e=>setManForm({...manForm,name:e.target.value})} className="inp" style={{marginBottom:8}}/>
                    <div className="g2" style={{gap:8,marginBottom:8}}>
                      {MACRO_KEYS.map(k=>(
                        <input key={k} placeholder={`${MACRO_CFG[k].label} (${MACRO_CFG[k].unit})`}
                          type="number" value={manForm[k]||""} onChange={e=>setManForm({...manForm,[k]:Number(e.target.value)})}
                          className="inp"/>
                      ))}
                    </div>
                    <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:10}}>
                      <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#8888a8",letterSpacing:".1em"}}>GRADE:</span>
                      {["A","B","C","D","F"].map(g=>(
                        <button key={g} onClick={()=>setManForm({...manForm,grade:g})} style={{
                          width:32,height:32,borderRadius:3,border:"none",cursor:"pointer",
                          background:manForm.grade===g?gradeColor(g):"#1a1a22",
                          color:manForm.grade===g?"#0c0c0f":"#8888a8",
                          fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:18,
                        }}>{g}</button>
                      ))}
                    </div>
                    <button className="btn" style={{width:"100%"}} onClick={()=>{if(manForm.name) addEntry(manForm);}}>✓ AGREGAR</button>
                  </div>
                )}

                {addMode==="fav" && (
                  <div>
                    {favs.length===0
                      ? <p style={{fontFamily:"'JetBrains Mono',monospace",color:"#44445a",fontSize:11,textAlign:"center",padding:"16px 0",letterSpacing:".1em"}}>SIN FAVORITOS · AGREGALOS EN CONFIG</p>
                      : favs.map(f=>(
                          <div key={f.id} onClick={()=>addEntry(f)} style={{background:"#1a1a22",border:"1px solid #2a2a38",borderRadius:3,padding:"10px 12px",marginBottom:8,cursor:"pointer"}}>
                            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:600,marginBottom:3}}>{f.name}</div>
                            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"10px",color:"#8888a8"}}>
                              <span style={{color:"#ffb830"}}>{f.calories}kcal</span> · <span style={{color:"#4dc8ff"}}>{f.protein}g P</span> · <span style={{color:"#a8ff3e"}}>{f.carbs}g C</span> · <span style={{color:"#ff7a4d"}}>{f.fats}g F</span>
                            </div>
                          </div>
                        ))
                    }
                  </div>
                )}
              </div>
            )}

            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#44445a",letterSpacing:".1em",marginBottom:10}}>
              {fmtDate(selDate).toUpperCase()} — {dayLog.length} COMIDAS · {totals.calories} KCAL
            </div>
            {dayLog.length===0 && (
              <div style={{textAlign:"center",padding:"32px 0"}}>
                <div style={{fontSize:32,marginBottom:8}}>🍽️</div>
                <p style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"10px",color:"#44445a",letterSpacing:".1em"}}>SIN REGISTROS {isToday?"HOY":"ESTE DÍA"}</p>
              </div>
            )}
            {[...dayLog].reverse().map(e=>(
              <div key={e.id} className="card fade-in" style={{marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",gap:6,marginBottom:6,flexWrap:"wrap",alignItems:"center"}}>
                      {e.meal && <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",background:"#1a1a22",color:"#a8ff3e",borderRadius:2,padding:"2px 7px"}}>{e.meal}</span>}
                      {e.dayType && <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",background:"#1a1a22",color:"#4dc8ff",borderRadius:2,padding:"2px 7px"}}>{e.dayType}</span>}
                      <span style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:22,color:gradeColor(e.grade||"B"),lineHeight:1}}>{e.grade||"B"}</span>
                      {e.score && <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#44445a"}}>{e.score}/10</span>}
                    </div>
                    <div style={{fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:14,marginBottom:6}}>{e.name}</div>
                    {(e.image || imgCache.get(`img_${e.id}`)) && <img src={e.image || imgCache.get(`img_${e.id}`)} alt="" style={{width:"100%",maxHeight:220,objectFit:"contain",background:"#0c0c0f",borderRadius:3,marginBottom:6,display:"block"}}/>}
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"10px",color:"#8888a8",marginBottom:4}}>
                      <span style={{color:"#ffb830"}}>{e.calories}kcal</span> · <span style={{color:"#4dc8ff"}}>{e.protein}g P</span> · <span style={{color:"#a8ff3e"}}>{e.carbs}g C</span> · <span style={{color:"#ff7a4d"}}>{e.fats}g F</span>
                    </div>
                    {(e.ldl_impact||e.hba1c_impact) && (
                      <div style={{display:"flex",gap:6,marginBottom:4,flexWrap:"wrap"}}>
                        {e.ldl_impact && <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:impactColor(e.ldl_impact)}}>LDL {impactArrow(e.ldl_impact)} {e.ldl_impact}</span>}
                        {e.hba1c_impact && <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:impactColor(e.hba1c_impact)}}>HbA1c {impactArrow(e.hba1c_impact)} {e.hba1c_impact}</span>}
                      </div>
                    )}
                    {e.notes && <div style={{fontSize:12,color:"#3ddc84",marginBottom:2}}>💡 {e.notes}</div>}
                    {e.alerta && <div style={{fontSize:12,color:"#ffb830"}}>⚠️ {e.alerta}</div>}
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:4,alignItems:"center"}}>
                    {(() => {
                      const isFav = favs.some(f=>f.name===e.name);
                      return (
                        <button
                          onClick={()=>{
                            if(isFav) saveFavs(favs.filter(f=>f.name!==e.name));
                            else { const nf={id:Date.now(),name:e.name,calories:e.calories,protein:e.protein,carbs:e.carbs,fats:e.fats,grade:e.grade,meal:e.meal,dayType:e.dayType,ldl_impact:e.ldl_impact,hba1c_impact:e.hba1c_impact,score:e.score,notes:e.notes}; saveFavs([...favs,nf],nf.id); }
                          }}
                          title={isFav?"Quitar de favoritos":"Guardar en favoritos"}
                          style={{background:"none",border:"none",cursor:"pointer",fontSize:16,padding:"4px 6px",opacity:isFav?1:0.35,transition:"opacity .2s,transform .15s",lineHeight:1}}
                          onMouseEnter={ev=>ev.currentTarget.style.opacity="1"}
                          onMouseLeave={ev=>ev.currentTarget.style.opacity=isFav?"1":"0.35"}
                        >⭐</button>
                      );
                    })()}
                    <button onClick={()=>{deleteFoodEntry(e.id).catch(()=>{}); saveLog({...log,[selDate]:dayLog.filter(x=>x.id!==e.id)},selDate);}}
                      style={{background:"none",border:"none",color:"#44445a",cursor:"pointer",fontSize:14,padding:"4px 6px"}}>🗑</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ══ SEMANA ══ */}
        {tab==="semana" && (
          <div>


            {/* ── Status Banner 7 días ── */}
            {(()=>{
              const _d7 = Array.from({length:7},(_,i)=>{ const d=new Date(); d.setDate(d.getDate()-i); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; });
              const _ld7 = _d7.filter(d=>(log[d]||[]).length>0);
              const _ae7 = _d7.flatMap(d=>log[d]||[]);
              const avg7 = _ld7.length>0 ? {
                calories: Math.round(_ae7.reduce((s,e)=>s+(e.calories||0),0)/_ld7.length),
                protein:  Math.round(_ae7.reduce((s,e)=>s+(e.protein||0),0)/_ld7.length),
                carbs:    Math.round(_ae7.reduce((s,e)=>s+(e.carbs||0),0)/_ld7.length),
                fats:     Math.round(_ae7.reduce((s,e)=>s+(e.fats||0),0)/_ld7.length),
              } : null;
              const _gc7 = {A:0,B:0,C:0,D:0,F:0};
              _ae7.forEach(e=>{ if(e.grade&&_gc7[e.grade]!==undefined) _gc7[e.grade]++; });
              const _tot7 = Object.values(_gc7).reduce((s,v)=>s+v,0);
              const abPct7 = _tot7>0 ? Math.round((_gc7.A+_gc7.B)/_tot7*100) : null;
              const dfPct7 = _tot7>0 ? Math.round((_gc7.D+_gc7.F)/_tot7*100) : null;
              if(!avg7) return null;
              const bColor = abPct7>=70?"#3ddc84":abPct7>=50?"#ffb830":"#ff4d4d";
              return (
                <div className="card fade-in" style={{marginBottom:20,borderLeft:`3px solid ${bColor}`,borderRadius:"0 4px 4px 0",background:abPct7>=70?"rgba(61,220,132,.04)":abPct7>=50?"rgba(255,184,48,.04)":"rgba(255,77,77,.04)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10,marginBottom:12}}>
                    <div>
                      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:bColor,letterSpacing:".15em",marginBottom:4}}>
                        {abPct7>=70?"✅ SEMANA EN PROTOCOLO":abPct7>=50?"⚠ SEMANA PARCIAL":"🔴 SEMANA FUERA DE PROTOCOLO"}
                      </div>
                      <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:16}}>
                        Promedio 7 días · {_ld7.length} días con registro
                      </div>
                    </div>
                    {abPct7!==null && (
                      <div style={{textAlign:"center",background:"#1a1a22",borderRadius:3,padding:"8px 16px"}}>
                        <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:32,color:bColor,lineHeight:1}}>{abPct7}%</div>
                        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#44445a",marginTop:2}}>comidas A+B</div>
                      </div>
                    )}
                  </div>
                  <div className="g4">
                    {MACRO_KEYS.map(k=>{
                      const real=avg7[k]; const meta=targets[k];
                      const pct=Math.round(real/meta*100);
                      const c=pct>=90&&pct<=115?"#3ddc84":pct>=75?"#ffb830":"#ff4d4d";
                      const delta=real-meta;
                      return (
                        <div key={k} style={{background:"#131318",borderRadius:3,padding:"10px 8px",textAlign:"center"}}>
                          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:"#44445a",marginBottom:3,letterSpacing:".08em"}}>{MACRO_CFG[k].label.toUpperCase()}</div>
                          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:22,color:c,lineHeight:1}}>{real}<span style={{fontSize:11,color:"#44445a"}}>{MACRO_CFG[k].unit}</span></div>
                          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:c,marginTop:3}}>
                            {pct}% meta · {delta>0?"+":""}{delta}{MACRO_CFG[k].unit}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {avg7.protein < targets.protein*0.8 && (
                    <div className="ins ir" style={{marginTop:10}}>
                      ⚠ Proteína promedio <strong>{avg7.protein}g</strong> — {targets.protein-avg7.protein}g bajo meta. Prioriza proteína magra en cada comida principal.
                    </div>
                  )}
                  {dfPct7>25 && (
                    <div className="ins ir" style={{marginTop:8}}>
                      ⚠ <strong>{dfPct7}%</strong> de las comidas esta semana fueron D/F. Revisa el Hall of Shame en ANÁLISIS.
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Aggregate stats */}
            <div className="sec-h">Acumulados por Período</div>
            <p style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"10px",color:"#44445a",marginBottom:16,lineHeight:1.5,letterSpacing:".04em"}}>Tus promedios, gráficas de macros y distribución de calidad nutricional.</p>
            <p style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"10px",color:"#44445a",marginBottom:16,lineHeight:1.5,letterSpacing:".04em"}}>Registra tus comidas del día — texto, foto o ambos. El AI analiza cada entrada.</p>
            <div className="g3" style={{marginBottom:20}}>
              {[
                {label:"Esta semana",days:7},
                {label:"Últimos 30 días",days:30},
                {label:"Todo el registro",days:365},
              ].map(({label,days})=>{
                const cutoff = new Date(); cutoff.setDate(cutoff.getDate()-days);
                const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth()+1).padStart(2,'0')}-${String(cutoff.getDate()).padStart(2,'0')}`;
                const entries = Object.entries(log).filter(([d])=>d>=cutoffStr).flatMap(([,e])=>e);
                const m = calcMacros(entries);
                const avgKcal = entries.length>0?Math.round(m.calories/Math.min(days,Object.keys(log).filter(d=>d>=cutoffStr&&(log[d]||[]).length>0).length||1)):0;
                const avgProt = entries.length>0?Math.round(m.protein/Math.min(days,Object.keys(log).filter(d=>d>=cutoffStr&&(log[d]||[]).length>0).length||1)):0;
                return (
                  <div key={label} className="card" style={{borderTop:"2px solid #a8ff3e"}}>
                    <div className="lbl">{label}</div>
                    <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:28,color:"#a8ff3e",lineHeight:1.1}}>{m.calories}<span style={{fontSize:11,color:"#44445a",marginLeft:2}}>kcal total</span></div>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"10px",color:"#8888a8",marginTop:6}}>
                      Prom: <span style={{color:"#ffb830"}}>{avgKcal} kcal/día</span> · <span style={{color:"#4dc8ff"}}>{avgProt}g prot/día</span>
                    </div>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"10px",color:"#44445a",marginTop:3}}>{entries.length} comidas registradas</div>
                  </div>
                );
              })}
            </div>

            {/* Calidad + Estadísticas fusionadas */}
            <div className="sec-h">Calidad & Estadísticas del Log</div>
            <div className="card" style={{marginBottom:20}}>
              {/* Grade % grandes + counts pequeños */}
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
                {Object.entries(gradeCounts).map(([g,cnt])=>{
                  const pct = totalEntries>0?Math.round(cnt/totalEntries*100):0;
                  return (
                    <div key={g} style={{flex:1,minWidth:56,background:"#1a1a22",borderRadius:3,padding:"12px 8px",textAlign:"center",borderTop:`2px solid ${gradeColor(g)}`}}>
                      <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:28,color:gradeColor(g),lineHeight:1}}>{pct}<span style={{fontSize:14,color:"#44445a"}}>%</span></div>
                      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#44445a",marginTop:3,letterSpacing:".08em"}}>{g} · {cnt}</div>
                    </div>
                  );
                })}
              </div>
              {/* Totals row */}
              <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
                {[
                  {l:"Total registros",v:totalEntries,c:"#a8ff3e"},
                  {l:"A+B (calidad)",v:`${totalEntries>0?Math.round((gradeCounts.A+gradeCounts.B)/totalEntries*100):0}%`,c:"#3ddc84"},
                  {l:"LDL+ positivo",v:allEntries.filter(e=>e.ldl_impact==="positivo").length,c:"#4dc8ff"},
                  {l:"Con alerta",v:allEntries.filter(e=>e.alerta&&e.alerta!=="null"&&e.alerta!==null).length,c:"#ffb830"},
                ].map(x=>(
                  <div key={x.l} style={{flex:1,minWidth:80,background:"#131318",borderRadius:3,padding:"8px 10px",textAlign:"center"}}>
                    <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:20,color:x.c,lineHeight:1}}>{x.v}</div>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:"#44445a",marginTop:3,letterSpacing:".06em"}}>{x.l}</div>
                  </div>
                ))}
              </div>
              {/* LDL/HbA1c impact */}
              <div style={{display:"flex",gap:10,flexWrap:"wrap",borderTop:"1px solid #2a2a38",paddingTop:12}}>
                {[
                  {label:"LDL positivo",count:allEntries.filter(e=>e.ldl_impact==="positivo").length,color:"#3ddc84"},
                  {label:"LDL negativo",count:allEntries.filter(e=>e.ldl_impact==="negativo").length,color:"#ff4d4d"},
                  {label:"HbA1c positivo",count:allEntries.filter(e=>e.hba1c_impact==="positivo").length,color:"#3ddc84"},
                  {label:"HbA1c negativo",count:allEntries.filter(e=>e.hba1c_impact==="negativo").length,color:"#ff4d4d"},
                ].map(({label,count,color})=>(
                  <div key={label} style={{display:"flex",alignItems:"center",gap:6,fontFamily:"'JetBrains Mono',monospace",fontSize:"10px",color:"#8888a8"}}>
                    <span className="grade-dot" style={{background:color}}/>{label}: <strong style={{color}}>{count}</strong>
                  </div>
                ))}
              </div>
            </div>


            {/* 14-day macro charts */}
            <div className="sec-h">Macros — 14 días</div>
            <div className="card" style={{padding:"16px 10px",marginBottom:8}}>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#ffb830",letterSpacing:".12em",marginBottom:6}}>CALORÍAS (kcal)</div>
              <div style={{height:160,position:"relative"}}>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={weekData} margin={{top:4,right:0,bottom:0,left:-20}}>
                    <XAxis dataKey="date" tick={{fill:"#8888a8",fontSize:8,fontFamily:"JetBrains Mono"}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fill:"#44445a",fontSize:8}} axisLine={false} tickLine={false} domain={[0,targets.calories*1.4]}/>
                    <Tooltip contentStyle={{background:"#1a1a22",border:"1px solid #2a2a38",borderRadius:4,fontSize:11}}/>
                    <ReferenceLine y={targets.calories} stroke="#a8ff3e" strokeDasharray="3,3" strokeWidth={1}/>
                    <Bar dataKey="calories" fill="#ffb830" radius={[2,2,0,0]} name="Kcal"/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="g2" style={{marginBottom:14}}>
              {[
                {key:"protein", color:"#4dc8ff", label:"PROTEÍNA (g)", target:targets.protein, tgtY:targets.protein*1.5},
                {key:"carbs",   color:"#a8ff3e", label:"CARBOHIDRATOS (g)", target:targets.carbs, tgtY:targets.carbs*1.5},
                {key:"fats",    color:"#ff7a4d", label:"GRASAS (g)", target:targets.fats, tgtY:targets.fats*1.5},
              ].map(({key,color,label,target,tgtY})=>(
                <div key={key} className="card" style={{padding:"12px 10px"}}>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color,letterSpacing:".12em",marginBottom:6}}>{label}</div>
                  <ResponsiveContainer width="100%" height={110}>
                    <BarChart data={weekData} margin={{top:2,right:0,bottom:0,left:-25}}>
                      <XAxis dataKey="date" tick={{fill:"#8888a8",fontSize:8}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fill:"#44445a",fontSize:8}} axisLine={false} tickLine={false} domain={[0,tgtY]}/>
                      <Tooltip contentStyle={{background:"#1a1a22",border:"1px solid #2a2a38",borderRadius:4,fontSize:11}}/>
                      <ReferenceLine y={target} stroke={color} strokeDasharray="3,3" strokeWidth={1}/>
                      <Bar dataKey={key} fill={color} radius={[2,2,0,0]} name={label}/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ))}
            </div>


            {/* Summary table */}
            <div className="sec-h">Resumen por Día — 14 días</div>
            <div className="card" style={{marginBottom:20}}>
              {weekData.filter(d=>d.entries>0).length === 0 ? (
                <div style={{textAlign:"center",padding:"24px 0",color:"#44445a"}}>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"10px",letterSpacing:".1em"}}>SIN REGISTROS EN LOS ÚLTIMOS 14 DÍAS</div>
                  <div style={{fontSize:11,marginTop:6}}>Empieza a registrar comidas en la pestaña REGISTRO</div>
                </div>
              ) : (
              <table className="tbl">
                <thead><tr><th>Fecha</th><th>Kcal</th><th>Prot</th><th>Carbs</th><th>Grasas</th><th>Comidas</th></tr></thead>
                <tbody>
                  {[...weekData].reverse().filter(d=>d.entries>0).map(d=>{
                    // detect cheat day: >130% kcal or >50% D/F entries
                    const dEntries = log[d.key]||[];
                    const dBad = dEntries.filter(e=>e.grade==="D"||e.grade==="F").length;
                    const isCheat = d.calories > targets.calories*1.3 || (dEntries.length>0 && dBad/dEntries.length>=0.5);
                    return (
                      <tr key={d.date} onClick={()=>{setSelDate(d.key);setTab("hoy");}} style={{cursor:"pointer",background:isCheat?"rgba(255,122,77,.04)":""}}>
                        <td className="mono" style={{color:"#8888a8"}}>
                          {d.date}
                          {isCheat && <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:"#ff7a4d",marginLeft:6,background:"rgba(255,122,77,.15)",borderRadius:2,padding:"1px 5px"}}>CHEAT</span>}
                        </td>
                        <td className="mono" style={{color:d.calories>=targets.calories*.9?"#3ddc84":isCheat?"#ff7a4d":"#ffb830"}}>{d.calories}</td>
                        <td className="mono" style={{color:d.protein>=targets.protein*.9?"#3ddc84":"#ffb830"}}>{d.protein}g</td>
                        <td className="mono" style={{color:"#8888a8"}}>{d.carbs}g</td>
                        <td className="mono" style={{color:"#8888a8"}}>{d.fats}g</td>
                        <td className="mono" style={{color:"#44445a"}}>{d.entries}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              )}
            </div>

            {/* ── CHEAT DAY ANALYZER ── */}

          </div>
        )}

        {/* ══ CUERPO ══ */}
        {tab==="cuerpo" && (()=>{
          // ── Global source filter ──
          const srcLabels = {inbody:'📊 InBody',renpho:'⚖️ Renpho',manual:'✏️ Manual'};
          const srcColors = {inbody:'#4dc8ff',renpho:'#a8ff3e',manual:'#8888a8'};
          const availSources = [...new Set(allInbody.map(r=>r.source||'inbody'))];
          const filteredInbody = inbodySourceFilter==='all'
            ? allInbody
            : allInbody.filter(r=>(r.source||'inbody')===inbodySourceFilter);
          const lastFI = filteredInbody[filteredInbody.length-1] || null;

          // ── Aggregation helper ──
          const aggregate = (data, mode) => {
            const effMode = mode==='auto'
              ? (data.length>60?'monthly':data.length>20?'weekly':'raw')
              : mode;
            if (effMode==='raw') return data.map(r=>({...r, dLabel:fmtD(r.d)}));
            const avg = arr => arr.length ? parseFloat((arr.reduce((s,v)=>s+v,0)/arr.length).toFixed(1)) : null;
            const groups = {};
            data.forEach(r => {
              // Guard: only process valid ISO dates YYYY-MM-DD or YYYY-MM
              if (!/^\d{4}-\d{2}/.test(r.d)) return;
              const parts = r.d.split('-');
              const y = parseInt(parts[0]);
              const m = parseInt(parts[1]);
              const d = parseInt(parts[2] || '1') || 1;
              if (!y || !m) return;
              let key;
              if (effMode==='monthly') {
                key = `${y}-${String(m).padStart(2,'0')}`;
              } else {
                // Weekly: find the Monday of this week safely
                const date = new Date(y, m-1, d);
                const dow = date.getDay(); // 0=Sun, 1=Mon...
                const daysToMon = dow===0 ? 6 : dow-1;
                const mon = new Date(date);
                mon.setDate(mon.getDate() - daysToMon); // always safe via getDate()
                key = `${mon.getFullYear()}-${String(mon.getMonth()+1).padStart(2,'0')}-${String(mon.getDate()).padStart(2,'0')}`;
              }
              if (!groups[key]) groups[key] = [];
              groups[key].push(r);
            });
            return Object.entries(groups).sort(([a],[b])=>a.localeCompare(b)).map(([key,rows])=>({
              d: key,
              dLabel: effMode==='monthly' ? fmtD(key+'-01') : ('S/'+fmtD(key)),
              w: avg(rows.map(r=>r.w).filter(v=>v!=null)),
              m: avg(rows.map(r=>r.m).filter(v=>v!=null)),
              f: avg(rows.map(r=>r.f).filter(v=>v!=null)),
              vi: avg(rows.map(r=>r.vi).filter(v=>v!=null)),
              _count: rows.length,
            }));
          };
          const effAggLabel = inbodyAgg==='auto'
            ? (filteredInbody.length>60?'(auto: mensual)':filteredInbody.length>20?'(auto: semanal)':'(auto: raw)')
            : '';

          return (
          <div>
            {/* ─── GLOBAL FILTER BAR ─── */}
            {availSources.length >= 1 && (
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:20,flexWrap:'wrap',
                background:'#131318',border:'1px solid #1e1e2a',borderRadius:4,padding:'10px 14px'}}>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'8px',color:'#44445a',letterSpacing:'.14em',marginRight:4}}>FUENTE</span>
                {['all',...availSources].map(s=>(
                  <button key={s} onClick={()=>setInbodySourceFilter(s)} style={{
                    fontFamily:"'JetBrains Mono',monospace",fontSize:'9px',letterSpacing:'.08em',
                    padding:'4px 12px',borderRadius:3,cursor:'pointer',border:'none',transition:'all .12s',
                    background: inbodySourceFilter===s ? (s==='all'?'#a8ff3e':srcColors[s]||'#a8ff3e') : 'transparent',
                    color: inbodySourceFilter===s ? '#0c0c0f' : (s==='all'?'#8888a8':srcColors[s]||'#8888a8'),
                    outline: inbodySourceFilter===s ? 'none' : `1px solid ${s==='all'?'#2a2a38':(srcColors[s]||'#8888a8')+'55'}`,
                  }}>
                    {s==='all' ? 'TODAS' : (srcLabels[s]||s.toUpperCase())}
                  </button>
                ))}
                {inbodySourceFilter!=='all' && (
                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'8px',color:'#ff9940',marginLeft:6}}>
                    ⚠ Algoritmos distintos — comparación orientativa
                  </span>
                )}
                <span style={{marginLeft:'auto',fontFamily:"'JetBrains Mono',monospace",fontSize:'8px',color:'#44445a'}}>
                  {filteredInbody.length} medición{filteredInbody.length!==1?'es':''}
                </span>
              </div>
            )}

            {/* ─── BODY PHOTOS + INBODY UPLOAD ─── */}
            <div className="sec-h">Registro Visual & InBody</div>
            <p style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"10px",color:"#44445a",marginBottom:16,lineHeight:1.5,letterSpacing:".04em"}}>Fotos de progreso, historial InBody y evolución de composición corporal.</p>
            <div className="card" style={{marginBottom:14}}>
              <div style={{display:"flex",gap:10,marginBottom:12,flexWrap:"wrap"}}>
                {/* Foto de progreso */}
                <div className="photo-zone upload-zone" style={{flex:"1 1 180px",minHeight:100,cursor:"pointer"}} onClick={()=>bodyPhotoRef.current.click()}>
                  <input ref={bodyPhotoRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{
                    const f=e.target.files[0]; if(!f) return;
                    const r=new FileReader();
                    r.onload=ev=>{
                      const canvas=document.createElement("canvas");
                      const img=new Image();
                      img.onload=()=>{
                        const maxW=480; const scale=Math.min(1,maxW/img.width);
                        canvas.width=img.width*scale; canvas.height=img.height*scale;
                        canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);
                        const compressed=canvas.toDataURL("image/jpeg",0.7).split(",")[1];
                        setPendingPhoto({b64:compressed,date:todayStr()});
                        setPhotoNote("");
                        bodyPhotoRef.current.value="";
                      };
                      img.src=ev.target.result;
                    };
                    r.readAsDataURL(f);
                  }}/>
                  <div style={{fontSize:26,marginBottom:5}}>📸</div>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"10px",color:"#8888a8",letterSpacing:".1em"}}>FOTO DE PROGRESO</div>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#44445a",marginTop:3}}>{todayStr()}</div>
                </div>
                {/* InBody upload */}
                <div className={`photo-zone upload-zone${inbodyB64?" has-img":""}`} style={{flex:"1 1 180px",minHeight:100,cursor:"pointer"}} onClick={()=>!inbodyB64&&inbodyImgRef.current.click()}>
                  <input ref={inbodyImgRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{
                    const f=e.target.files[0]; if(!f) return;
                    const r=new FileReader(); r.onload=ev=>setInbodyB64(ev.target.result.split(",")[1]); r.readAsDataURL(f);
                  }}/>
                  {inbodyB64 ? (
                    <div style={{width:"100%"}}>
                      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"10px",color:"#a8ff3e",marginBottom:8}}>📊 Imagen cargada</div>
                      <div style={{display:"flex",gap:6}}>
                        <button className="btn" style={{flex:1,fontSize:"9px",padding:"6px 8px"}} onClick={e=>{e.stopPropagation();parseInbodyUpload();}} disabled={inbodyLoading}>
                          {inbodyLoading?<span className="dots"><span/><span/><span/></span>:"🔍 LEER CON IA"}
                        </button>
                        <button className="btn-sm" style={{fontSize:"9px"}} onClick={e=>{e.stopPropagation();setInbodyB64(null);setInbodyResult(null);}}>✕</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{fontSize:26,marginBottom:5}}>📊</div>
                      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"10px",color:"#8888a8",letterSpacing:".1em"}}>SUBIR INBODY</div>
                      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#44445a",marginTop:3}}>foto o escaneo</div>
                    </>
                  )}
                </div>
              </div>
              {/* Manual InBody entry button */}
              <button className="btn-sm" style={{marginBottom:10,fontSize:"9px",background:"#1a1a22",border:"1px solid #2a2a38",color:"#8888a8"}}
                onClick={()=>setShowManualInbody(v=>!v)}>
                ✏️ {showManualInbody?"CANCELAR":"INGRESAR DATOS MANUALMENTE"}
              </button>
              {showManualInbody && (
                <div className="card fade-in" style={{marginBottom:12,border:"1px solid #2a2a38"}}>
                  <div className="lbl" style={{marginBottom:10}}>📝 ENTRADA MANUAL — PESO / INBODY</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                    {[
                      ["date","Fecha (YYYY-MM-DD o YYYY-MM)","text",true],
                      ["weight","Peso (kg)","number",true],
                      ["muscle","Masa muscular (kg)","number",false],
                      ["fat_pct","% Grasa","number",false],
                      ["visceral","Grasa visceral (nivel)","number",false],
                      ["waist","Cintura (cm)","number",false],
                      ["inbody_score","Score InBody (0-100)","number",false],
                    ].map(([k,placeholder,type,req])=>(
                      <input key={k} type={type} placeholder={placeholder+(req?" *":"")}
                        value={manualInbody[k]} onChange={e=>setManualInbody(p=>({...p,[k]:e.target.value}))}
                        className="inp" style={{fontSize:11}}/>
                    ))}
                    {/* Vitales */}
                    <div style={{gridColumn:"1/-1",fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:"#44445a",letterSpacing:".1em",marginTop:6,marginBottom:2}}>
                      VITALES (opcional)
                    </div>
                    <input type="number" placeholder="Presión sistólica (mmHg)" value={manualInbody.systolic}
                      onChange={e=>setManualInbody(p=>({...p,systolic:e.target.value}))} className="inp" style={{fontSize:11}}/>
                    <input type="number" placeholder="Presión diastólica (mmHg)" value={manualInbody.diastolic}
                      onChange={e=>setManualInbody(p=>({...p,diastolic:e.target.value}))} className="inp" style={{fontSize:11}}/>
                    <input type="number" placeholder="Frecuencia cardíaca (bpm)" value={manualInbody.hr}
                      onChange={e=>setManualInbody(p=>({...p,hr:e.target.value}))} className="inp" style={{fontSize:11}}/>
                    {/* Otro */}
                    <div style={{gridColumn:"1/-1",fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:"#44445a",letterSpacing:".1em",marginTop:6,marginBottom:2}}>
                      OTRO INDICADOR (opcional)
                    </div>
                    <input placeholder="Nombre (ej: Temperatura, SpO2...)" value={manualInbody.otro_label}
                      onChange={e=>setManualInbody(p=>({...p,otro_label:e.target.value}))} className="inp" style={{fontSize:11}}/>
                    <input type="number" placeholder="Valor" value={manualInbody.otro_valor}
                      onChange={e=>setManualInbody(p=>({...p,otro_valor:e.target.value}))} className="inp" style={{fontSize:11}}/>
                    <input placeholder="Unidad (ej: °C, %, mg/dL)" value={manualInbody.otro_unidad}
                      onChange={e=>setManualInbody(p=>({...p,otro_unidad:e.target.value}))} className="inp" style={{fontSize:11}}/>
                    <input placeholder="Nota (ej: Báscula casa, gym...)" value={manualInbody.note}
                      onChange={e=>setManualInbody(p=>({...p,note:e.target.value}))}
                      className="inp" style={{fontSize:11,gridColumn:"1/-1"}}/>
                  </div>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#44445a",marginBottom:8}}>
                    * Solo Fecha y Peso son obligatorios. El resto es opcional.
                  </div>
                  <button className="btn" style={{width:"100%"}} onClick={saveManualInbody}>✓ GUARDAR MEDICIÓN</button>
                </div>
              )}
              {/* InBody result */}
              {inbodyResult?.error && <div style={{fontFamily:"'JetBrains Mono',monospace",color:"#ff4d4d",fontSize:11,marginBottom:10}}>{inbodyResult.error}</div>}
              {inbodyResult && !inbodyResult.error && (
                <div style={{background:"#1a1a22",border:"1px solid #2a2a38",borderRadius:4,padding:14,marginBottom:12}} className="fade-in">
                  <div className="lbl" style={{marginBottom:8}}>Valores extraídos del InBody:</div>
                  <div className="g4" style={{marginBottom:10}}>
                    {[["Fecha",inbodyResult.date||"—"],["Peso",`${inbodyResult.weight||"—"} kg`],["Músculo",`${inbodyResult.muscle||"—"} kg`],["% Grasa",`${inbodyResult.fat_pct||"—"}%`]].map(([l,v])=>(
                      <div key={l} style={{background:"#131318",borderRadius:3,padding:"8px",textAlign:"center"}}>
                        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#44445a",marginBottom:3}}>{l}</div>
                        <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:16,color:"#a8ff3e"}}>{v}</div>
                      </div>
                    ))}
                  </div>
                  {inbodyResult.notes && <div style={{fontSize:12,color:"#8888a8",marginBottom:10}}>📝 {inbodyResult.notes}</div>}
                  <button className="btn" style={{width:"100%"}} onClick={confirmInbody}>✓ GUARDAR EN HISTORIAL</button>
                </div>
              )}
              {pendingPhoto && (
                <div className="card fade-in" style={{marginBottom:12,borderLeft:"3px solid #a8ff3e",borderRadius:"0 4px 4px 0",padding:"12px 14px"}}>
                  <div className="lbl" style={{marginBottom:8}}>CONFIRMAR FOTO · {pendingPhoto.date}</div>
                  <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:10}}>
                    <img src={`data:image/jpeg;base64,${pendingPhoto.b64}`} alt="preview"
                      style={{width:60,height:80,objectFit:"cover",borderRadius:3,flexShrink:0}}/>
                    <input value={photoNote} onChange={e=>setPhotoNote(e.target.value)}
                      placeholder="Nota (ej: semana 4, definición, post-entreno...)"
                      className="inp" style={{flex:1}}/>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <button className="btn" style={{flex:1}} onClick={()=>{
                      const newPhoto={id:Date.now(),date:pendingPhoto.date,thumb:pendingPhoto.b64,note:photoNote};
                      saveBodyPhotos([...bodyPhotos,newPhoto]);
                      setPendingPhoto(null); setPhotoNote("");
                    }}>✓ GUARDAR FOTO</button>
                    <button className="btn-sm" onClick={()=>{setPendingPhoto(null);setPhotoNote("");}}>✕ CANCELAR</button>
                  </div>
                </div>
              )}
              {bodyPhotos.length > 0 ? (
                <div>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#44445a",letterSpacing:".1em",marginBottom:10}}>
                    {bodyPhotos.length} FOTO{bodyPhotos.length!==1?"S":""} · Más reciente primero
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:8}}>
                    {[...bodyPhotos].reverse().map(p=>(
                      <div key={p.id} style={{position:"relative",borderRadius:4,overflow:"hidden",border:"1px solid #2a2a38",background:"#0c0c0f"}}>
                        <img src={`data:image/jpeg;base64,${p.thumb}`} alt={p.date}
                          style={{width:"100%",aspectRatio:"3/4",objectFit:"cover",display:"block"}}/>
                        <div style={{padding:"6px 8px",background:"#131318"}}>
                          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#a8ff3e"}}>{p.date}</div>
                          {p.note && <div style={{fontSize:10,color:"#8888a8",marginTop:2,lineHeight:1.3}}>{p.note}</div>}
                        </div>
                        <button onClick={()=>saveBodyPhotos(bodyPhotos.filter(x=>x.id!==p.id))}
                          style={{position:"absolute",top:4,right:4,background:"rgba(0,0,0,.6)",border:"none",borderRadius:2,color:"#ff4d4d",cursor:"pointer",fontSize:12,padding:"2px 5px",lineHeight:1}}>×</button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#44445a",textAlign:"center",padding:"16px 0",letterSpacing:".1em"}}>
                  AÚN NO HAY FOTOS · AGREGA LA PRIMERA HOY
                </div>
              )}
            </div>

            {/* ─── CORRELATION: nutrition vs body ─── */}
            {bodyPhotos.length > 0 && (
              <div>
                <div className="sec-h">Correlación Nutrición × Cuerpo</div>
                <div className="card" style={{marginBottom:14}}>
                  <div className="lbl" style={{marginBottom:12}}>Promedio nutricional por semana (últimas 4)</div>
                  <div className="tbl-wrap" style={{overflowX:"auto"}}>
                    <table className="tbl">
                      <thead><tr><th>Semana</th><th>Kcal/día</th><th>Prot/día</th><th>A+B %</th><th>LDL+</th><th>Fotos</th></tr></thead>
                      <tbody>
                        {Array.from({length:4},(_,wi)=>{
                          const wEnd=new Date(); wEnd.setDate(wEnd.getDate()-wi*7);
                          const wStart=new Date(wEnd); wStart.setDate(wStart.getDate()-6);
                          const wDates=Array.from({length:7},(_,di)=>{const d=new Date(wStart);d.setDate(d.getDate()+di);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;});
                          const wEntries=wDates.flatMap(d=>log[d]||[]);
                          const wLoggedDays=wDates.filter(d=>(log[d]||[]).length>0).length;
                          if(wLoggedDays===0) return null;
                          const wMacros=calcMacros(wEntries);
                          const wAB=wEntries.filter(e=>e.grade==="A"||e.grade==="B").length;
                          const wLDLPos=wEntries.filter(e=>e.ldl_impact==="positivo").length;
                          const wABpct=wEntries.length?Math.round(wAB/wEntries.length*100):0;
                          const wAvgKcal=Math.round(wMacros.calories/wLoggedDays);
                          const wAvgProt=Math.round(wMacros.protein/wLoggedDays);
                          const wLabel=wi===0?"Esta semana":wi===1?"Sem. pasada":`Hace ${wi} sem.`;
                          const wPhotos=bodyPhotos.filter(p=>p.date>=wDates[0]&&p.date<=wDates[6]).length;
                          return (
                            <tr key={wi}>
                              <td style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:"#8888a8"}}>{wLabel}</td>
                              <td className="mono" style={{color:wAvgKcal>=targets.calories*0.9&&wAvgKcal<=targets.calories*1.1?"#3ddc84":wAvgKcal<targets.calories*0.7?"#ff4d4d":"#ffb830"}}>{wAvgKcal}</td>
                              <td className="mono" style={{color:wAvgProt>=targets.protein*0.85?"#4dc8ff":"#ff4d4d"}}>{wAvgProt}g</td>
                              <td className="mono" style={{color:wABpct>=70?"#3ddc84":wABpct>=50?"#ffb830":"#ff4d4d"}}>{wABpct}%</td>
                              <td className="mono" style={{color:"#3ddc84"}}>{wLDLPos}</td>
                              <td className="mono" style={{color:wPhotos>0?"#a8ff3e":"#44445a"}}>{wPhotos>0?"📸 "+wPhotos:"—"}</td>
                            </tr>
                          );
                        }).filter(Boolean)}
                      </tbody>
                    </table>
                  </div>
                  <div style={{marginTop:12,fontSize:11,color:"#44445a",fontFamily:"'JetBrains Mono',monospace",lineHeight:1.7}}>
                    💡 Toma fotos en las mismas condiciones (mañana, en ayunas, misma luz) para comparaciones válidas.<br/>
                    💡 Las semanas con Prot/día &gt; {targets.protein}g y A+B &gt; 70% deberían correlacionar con mejor composición.
                  </div>
                </div>
              </div>
            )}

            <div className="sec-h">Estado Actual{lastFI ? ` — ${fmtD(lastFI.d)}` : ""}</div>
            {!lastFI ? (
              <div style={{textAlign:"center",padding:"32px 0"}}>
                <div style={{fontSize:36,marginBottom:12}}>⚖️</div>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,color:"#44445a",marginBottom:6}}>Sin mediciones InBody</div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"10px",color:"#44445a",lineHeight:1.7}}>Sube tu primera foto de InBody<br/>usando el botón de arriba.</div>
              </div>
            ) : (
            <div className="g4" style={{marginBottom:20}}>
              {(()=>{
                const peakW = filteredInbody.reduce((mx,x)=>x.w>mx?x.w:mx, 0);
                const peakWDate = filteredInbody.find(x=>x.w===peakW)?.d||"";
                const firstM = filteredInbody[0]?.m;
                const bestF = filteredInbody.reduce((mn,x)=>x.f<mn?x.f:mn, 100);
                const bestFDate = filteredInbody.find(x=>x.f===bestF)?.d||"";
                const tmb = lastFI.m ? Math.round(370 + 21.6*lastFI.m) : Math.round(10*lastFI.w + 6.25*175 - 5*39 + 5);
                return [
                  {l:"Peso",v:lastFI.w,u:"kg",d:peakW>lastFI.w?`Peak ${peakW} kg (${peakWDate})`:"Peso mínimo actual",sub:`Objetivo: ${targets.weightGoal||80} kg`,c:"#a8ff3e"},
                  {l:"Masa Muscular",v:lastFI.m??'—',u:"kg",d:firstM?`+${(lastFI.m-firstM).toFixed(1)} kg vs ${fmtD(filteredInbody[0].d)}`:"Primera medición",sub:`Objetivo: ≥${targets.muscleGoal||39} kg`,c:"#3ddc84"},
                  {l:"% Grasa",v:lastFI.f??'—',u:"%",d:`Mejor: ${bestF}% (${bestFDate})`,sub:`Objetivo: ${targets.fatGoal||"15–16"}%`,c:"#ffb830"},
                  {l:"Grasa Visceral",v:lastFI.vi||"—",u:"lvl",d:(lastFI.vi||0)<10?"Rango saludable (<10)":(lastFI.vi||0)<15?"Riesgo moderado":"Riesgo alto",sub:`TMB: ${tmb.toLocaleString()} kcal/día`,c:"#4dc8ff"},
                ].map(x=>(
                  <div key={x.l} className="card" style={{borderTop:`2px solid ${x.c}`}}>
                    <div className="lbl">{x.l}</div>
                    <div className="bnum" style={{color:x.c}}>{x.v}<span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:14,color:"#8888a8",marginLeft:2}}>{x.u}</span></div>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#3ddc84",marginTop:5}}>{fmtD(x.d)}</div>
                    <div style={{fontSize:11,color:"#8888a8",marginTop:3}}>{x.sub}</div>
                  </div>
                ));
              })()}
            </div>
            )}

            {/* ── BODY RECOMPOSITION INDEX ── */}
            {allInbody.length > 0 && (()=>{
              // Own source filter
              const briFiltered = briSource === 'all'
                ? allInbody
                : allInbody.filter(r => (r.source||'inbody') === briSource);
              const briLast = briFiltered[briFiltered.length - 1] || null;
              if (!briLast || briLast.m == null || briLast.f == null) return null;

              const fatMass   = parseFloat((briLast.w * briLast.f / 100).toFixed(1));
              const muscleMass= briLast.m;
              const mfr       = parseFloat((muscleMass / fatMass).toFixed(2));
              const heightM   = (userProfile.height || 175) / 100;
              const leanMass  = briLast.w * (1 - briLast.f / 100);
              const ffmi      = parseFloat((leanMass / (heightM * heightM)).toFixed(1));
              const whr       = briLast.whr || null;

              // Available sources for this card
              const briSources = [...new Set(allInbody.map(r => r.source||'inbody'))];
              const briSrcColors = {inbody:'#4dc8ff', renpho:'#a8ff3e', manual:'#8888a8'};
              const briSrcLabels = {inbody:'InBody', renpho:'Renpho', manual:'Manual'};

              // Trend: compare last 2 in briFiltered
              const prev2 = briFiltered.length >= 2 ? briFiltered[briFiltered.length - 2] : null;
              const dM = prev2 && briLast.m != null && prev2.m != null ? parseFloat((briLast.m - prev2.m).toFixed(1)) : null;
              const dF = prev2 && briLast.f != null && prev2.f != null ? parseFloat((briLast.f - prev2.f).toFixed(1)) : null;

              let recompStatus, recompColor, recompIcon;
              if (dM !== null && dF !== null) {
                if (dM > 0.1 && dF < -0.2)       { recompStatus = "Recomposición activa";  recompColor = "#a8ff3e"; recompIcon = "🔥"; }
                else if (dM > 0.1 && dF >= -0.2)  { recompStatus = "Ganando masa";          recompColor = "#4dc8ff"; recompIcon = "💪"; }
                else if (dM <= 0.1 && dF < -0.2)  { recompStatus = "Perdiendo grasa";       recompColor = "#ffb830"; recompIcon = "📉"; }
                else if (dM < -0.1 && dF > 0.2)   { recompStatus = "Deterioro muscular";    recompColor = "#ff4d4d"; recompIcon = "⚠️"; }
                else                               { recompStatus = "Mantenimiento";          recompColor = "#8888a8"; recompIcon = "→"; }
              } else {
                recompStatus = "Sin tendencia aún"; recompColor = "#8888a8"; recompIcon = "📊";
              }

              // FFMI classification
              const ffmiLabel = ffmi >= 24 ? "Muy atlético" : ffmi >= 22 ? "Atlético" : ffmi >= 20 ? "Por encima del promedio" : ffmi >= 18 ? "Promedio" : "Por debajo del promedio";
              const ffmiColor = ffmi >= 22 ? "#a8ff3e" : ffmi >= 20 ? "#3ddc84" : ffmi >= 18 ? "#ffb830" : "#ff7a4d";

              // MFR classification
              const mfrLabel = mfr >= 2.5 ? "Excelente" : mfr >= 2.0 ? "Buena" : mfr >= 1.5 ? "Moderada" : "Mejorable";
              const mfrColor = mfr >= 2.5 ? "#a8ff3e" : mfr >= 2.0 ? "#3ddc84" : mfr >= 1.5 ? "#ffb830" : "#ff7a4d";

              return (
                <div style={{marginBottom:20}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8,marginBottom:4}}>
                    <div className="sec-h" style={{marginBottom:0}}>Body Recomposition Index</div>
                    {briSources.length > 1 && (
                      <div style={{display:"flex",gap:4}}>
                        {['all',...briSources].map(s=>{
                          const active = briSource===s;
                          const col = s==='all'?'#8888a8':(briSrcColors[s]||'#8888a8');
                          return (
                            <button key={s} onClick={()=>setBriSource(s)} style={{
                              fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",letterSpacing:".07em",
                              padding:"3px 10px",borderRadius:3,cursor:"pointer",border:"none",
                              background: active ? col : "transparent",
                              color: active ? "#0c0c0f" : col,
                              outline: active ? "none" : `1px solid ${col}55`,
                              transition:"all .12s",
                            }}>{s==='all'?'TODAS':(briSrcLabels[s]||s).toUpperCase()}</button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:"#44445a",marginBottom:10}}>
                    Fuente: <strong style={{color: briSource==='all'?'#8888a8':(briSrcColors[briSource]||'#8888a8')}}>{briSource==='all'?'Todas las fuentes':(briSrcLabels[briSource]||briSource)}</strong>
                    {briLast && <> · Última medición: <strong style={{color:"#e8e8f0"}}>{fmtD(briLast.d)}</strong></>}
                    {briFiltered.length > 1 && <> · {briFiltered.length} mediciones</>}
                  </div>
                  <div className="card" style={{marginBottom:12,borderTop:`2px solid ${recompColor}`}}>
                    {/* Status hero row */}
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:8}}>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <span style={{fontSize:28}}>{recompIcon}</span>
                        <div>
                          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:18,color:recompColor}}>{recompStatus}</div>
                          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#44445a",marginTop:2}}>
                            {dM !== null ? `Δ músculo ${dM > 0 ? "+" : ""}${dM} kg · Δ grasa ${dF > 0 ? "+" : ""}${dF}% vs medición anterior` : "Se necesitan ≥2 mediciones para tendencia"}
                          </div>
                        </div>
                      </div>
                      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#44445a",textAlign:"right"}}>
                        Músculo: <strong style={{color:"#3ddc84"}}>{muscleMass} kg</strong> · Grasa: <strong style={{color:"#ffb830"}}>{fatMass} kg</strong>
                      </div>
                    </div>

                    {/* Metrics row */}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                      {/* MFR */}
                      <div style={{background:"#0c0c0f",borderRadius:3,padding:"10px 12px",borderTop:`1px solid ${mfrColor}`}}>
                        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:"#44445a",letterSpacing:".1em",marginBottom:4}}>RATIO M/G</div>
                        <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:22,color:mfrColor,lineHeight:1}}>{mfr}</div>
                        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:mfrColor,marginTop:3}}>{mfrLabel}</div>
                        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"7px",color:"#44445a",marginTop:2}}>músculo ÷ grasa (kg)</div>
                      </div>
                      {/* FFMI */}
                      <div style={{background:"#0c0c0f",borderRadius:3,padding:"10px 12px",borderTop:`1px solid ${ffmiColor}`}}>
                        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:"#44445a",letterSpacing:".1em",marginBottom:4}}>FFMI</div>
                        <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:22,color:ffmiColor,lineHeight:1}}>{ffmi}</div>
                        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:ffmiColor,marginTop:3}}>{ffmiLabel}</div>
                        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"7px",color:"#44445a",marginTop:2}}>masa magra/altura²</div>
                      </div>
                      {/* WHR */}
                      <div style={{background:"#0c0c0f",borderRadius:3,padding:"10px 12px",borderTop:`1px solid ${whr?(whr<0.90?"#a8ff3e":whr<0.95?"#ffb830":"#ff4d4d"):"#2a2a38"}`}}>
                        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:"#44445a",letterSpacing:".1em",marginBottom:4}}>WHR</div>
                        <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:22,color:whr?(whr<0.90?"#a8ff3e":whr<0.95?"#ffb830":"#ff4d4d"):"#44445a",lineHeight:1}}>{whr??'—'}</div>
                        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:whr?(whr<0.90?"#a8ff3e":whr<0.95?"#ffb830":"#ff4d4d"):"#44445a",marginTop:3}}>{whr?(whr<0.90?"Óptimo":whr<0.95?"Riesgo moderado":"Riesgo alto"):"Sin dato"}</div>
                        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"7px",color:"#44445a",marginTop:2}}>cintura/cadera (meta &lt;0.90)</div>
                      </div>
                    </div>

                    {/* Progress bar: muscle vs fat composition */}
                    <div style={{marginTop:12}}>
                      <div style={{display:"flex",justifyContent:"space-between",fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:"#44445a",marginBottom:4}}>
                        <span>Composición corporal</span>
                        <span>Magra {(100-briLast.f).toFixed(1)}% · Grasa {briLast.f}%</span>
                      </div>
                      <div style={{height:6,borderRadius:3,background:"#1a1a22",overflow:"hidden",display:"flex"}}>
                        <div style={{flex:100-briLast.f,background:"#3ddc84",transition:"flex .4s"}}/>
                        <div style={{flex:briLast.f,background:"#ffb830",transition:"flex .4s"}}/>
                      </div>
                      <div style={{display:"flex",gap:12,marginTop:4,fontFamily:"'JetBrains Mono',monospace",fontSize:"7px",color:"#44445a"}}>
                        <span style={{color:"#3ddc84"}}>● Masa magra {(leanMass).toFixed(1)} kg</span>
                        <span style={{color:"#ffb830"}}>● Grasa {fatMass} kg</span>
                        <span>Meta: músculo ↑ · grasa ↓</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ── CHART: Aggregation controls + chart ── */}
            {(()=>{
              const chartData = aggregate(filteredInbody, inbodyAgg);
              const wVals = chartData.map(r=>r.w).filter(Boolean);
              const fVals = chartData.map(r=>r.f).filter(Boolean);
              const wMin = wVals.length ? Math.floor(Math.min(...wVals)/5)*5 : 60;
              const wMax = wVals.length ? Math.ceil(Math.max(...wVals)/5)*5 : 90;
              const fMin = fVals.length ? Math.floor(Math.min(...fVals)/2)*2 : 12;
              const fMax = fVals.length ? Math.ceil(Math.max(...fVals)/2)*2 : 24;
              const aggActive = (v) => ({
                fontFamily:"'JetBrains Mono',monospace",fontSize:'9px',letterSpacing:'.07em',
                padding:'3px 10px',borderRadius:3,cursor:'pointer',border:'none',transition:'all .12s',
                background: inbodyAgg===v ? '#a8ff3e' : 'transparent',
                color: inbodyAgg===v ? '#0c0c0f' : '#666680',
                outline: inbodyAgg===v ? 'none' : '1px solid #2a2a38',
              });
              return (<>
              {/* Controls row */}
              <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:10,flexWrap:'wrap'}}>
                <div className="sec-h" style={{margin:0,flex:1}}>
                  Progresión — {chartData[0]?chartData[0].dLabel:''} a {chartData[chartData.length-1]?chartData[chartData.length-1].dLabel:''}&nbsp;
                  <span style={{color:'#44445a',fontWeight:400}}>({chartData.length} pts {effAggLabel})</span>
                </div>
                <div style={{display:'flex',gap:4}}>
                  {[['auto','AUTO'],['raw','RAW'],['weekly','SEM'],['monthly','MES']].map(([v,l])=>(
                    <button key={v} onClick={()=>setInbodyAgg(v)} style={aggActive(v)}>{l}</button>
                  ))}
                </div>
              </div>
              <div className="card chart-wrap" style={{padding:"16px 10px",marginBottom:20}}>
                <ResponsiveContainer key={`inbody-chart-${tab}-${inbodySourceFilter}-${inbodyAgg}`} width="100%" height={220}>
                  <LineChart data={chartData} margin={{top:5,right:10,bottom:5,left:0}}>
                    <XAxis dataKey="dLabel" tick={{fill:"#44445a",fontSize:8,fontFamily:"JetBrains Mono"}} interval="preserveStartEnd"/>
                    <YAxis yAxisId="w" tick={{fill:"#8888a8",fontSize:9}} domain={[wMin,wMax]}/>
                    <YAxis yAxisId="f" orientation="right" tick={{fill:"#8888a8",fontSize:9}} domain={[fMin,fMax]}/>
                    <Tooltip contentStyle={{background:"#1a1a22",border:"1px solid #2a2a38",borderRadius:4,fontSize:11}}
                      formatter={(val,name,props)=>[`${val}${props.dataKey==='f'?'%':' kg'}${props.payload._count>1?` (avg ${props.payload._count})`:''} `,name]}
                      labelFormatter={l=>l}/>
                    <Legend wrapperStyle={{fontSize:10,fontFamily:"JetBrains Mono",color:"#8888a8"}}/>
                    <Line yAxisId="w" type="monotone" dataKey="w" stroke="#a8ff3e" strokeWidth={2} dot={{r:chartData.length>30?1:3,fill:"#a8ff3e"}} name="Peso (kg)"/>
                    <Line yAxisId="w" type="monotone" dataKey="m" stroke="#4dc8ff" strokeWidth={2} dot={{r:chartData.length>30?1:3,fill:"#4dc8ff"}} name="Músculo (kg)" connectNulls/>
                    <Line yAxisId="f" type="monotone" dataKey="f" stroke="#ff7a4d" strokeWidth={2} dot={{r:chartData.length>30?1:3,fill:"#ff7a4d"}} strokeDasharray="5,3" name="% Grasa"/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
              </>);
            })()}

            {/* ── TABLE: N most recent with row selector ── */}
            {(()=>{
              const reversed = [...filteredInbody].reverse();
              const showing = tableRows==='all' ? reversed : reversed.slice(0, tableRows);
              const srcCfg = {inbody:{ic:"📊",col:"#4dc8ff"},renpho:{ic:"⚖️",col:"#a8ff3e"},manual:{ic:"✏️",col:"#8888a8"}};
              return (<>
              {/* Table header row */}
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10,flexWrap:'wrap'}}>
                <div className="sec-h" style={{margin:0,flex:1}}>
                  Historial de Mediciones
                  <span style={{color:'#44445a',fontWeight:400,fontSize:'9px',marginLeft:6}}>
                    ({showing.length} de {filteredInbody.length})
                  </span>
                </div>
                <div style={{display:'flex',gap:4,alignItems:'center'}}>
                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'8px',color:'#44445a'}}>MOSTRAR</span>
                  {[10,25,50,'all'].map(n=>(
                    <button key={n} onClick={()=>setTableRows(n)} style={{
                      fontFamily:"'JetBrains Mono',monospace",fontSize:'9px',
                      padding:'3px 8px',borderRadius:3,cursor:'pointer',border:'none',
                      background: tableRows===n ? '#a8ff3e' : 'transparent',
                      color: tableRows===n ? '#0c0c0f' : '#666680',
                      outline: tableRows===n ? 'none' : '1px solid #2a2a38',
                    }}>{n==='all'?'TODO':n}</button>
                  ))}
                </div>
              </div>
              <div className="card tbl-wrap" style={{marginBottom:20}}>
                <table className="tbl">
                  <thead><tr><th>Fecha</th><th>Fuente</th><th>Peso</th><th>Músculo</th><th>% Grasa</th><th>Visceral</th><th className="hide-xs">WHR</th><th className="hide-xs">Score</th><th className="hide-xs">Presión</th><th className="hide-xs">FC</th><th className="hide-xs">Otro</th><th>Nota</th></tr></thead>
                  <tbody>
                    {showing.map(r=>{
                      const src = r.source||"inbody";
                      const {ic,col} = srcCfg[src]||srcCfg.inbody;
                      const isNew = r.note?.includes("HOY")||r.note?.includes("Nuevo")||r.note?.includes("◀");
                      return (
                      <tr key={r.d+(r.source||"")+(r.w||"")} style={{background:isNew&&src==="inbody"?"rgba(77,200,255,.04)":isNew&&src==="renpho"?"rgba(168,255,62,.04)":""}}>
                        <td className="mono" style={{color:isNew?"#e8e8f0":"#8888a8",fontWeight:isNew?600:400}}>{fmtD(r.d)}</td>
                        <td><span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:col,background:col+"18",borderRadius:2,padding:"1px 5px"}}>{ic} {src.toUpperCase()}</span></td>
                        <td className="mono">{r.w} kg</td>
                        <td className="mono" style={{color:"#4dc8ff"}}>{r.m ?? "—"}{r.m?" kg":""}</td>
                        <td className="mono" style={{color:!r.f?"#44445a":r.f<=14.5?"#3ddc84":r.f<=17?"#a8ff3e":r.f<=19?"#ffb830":"#ff4d4d"}}>{r.f!=null?r.f+"%":"—"}</td>
                        <td className="mono" style={{color:!r.vi?"#44445a":r.vi<=5?"#3ddc84":"#ffb830"}}>{r.vi??"—"}</td>
                        <td className="mono hide-xs" style={{color:!r.whr?"#44445a":r.whr<=0.90?"#3ddc84":"#ffb830"}}>{r.whr??"—"}</td>
                        <td className="mono hide-xs" style={{color:!r.s?"#44445a":r.s>=85?"#3ddc84":r.s>=80?"#4dc8ff":"#44445a"}}>{r.s??"—"}</td>
                        <td className="mono hide-xs" style={{color:r.systolic?"#ff9940":"#44445a",whiteSpace:"nowrap"}}>
                          {r.systolic&&r.diastolic?`${r.systolic}/${r.diastolic}`:r.systolic?`${r.systolic}/—`:"—"}
                        </td>
                        <td className="mono hide-xs" style={{color:r.hr?"#c084fc":"#44445a"}}>{r.hr?`${r.hr} bpm`:"—"}</td>
                        <td className="hide-xs" style={{fontSize:10,color:"#8888a8",whiteSpace:"nowrap"}}>
                          {r.otro?`${r.otro.label}: ${r.otro.valor}${r.otro.unidad?" "+r.otro.unidad:""}`:"—"}
                        </td>
                        <td style={{fontSize:10,color:"#8888a8"}}>{r.note}</td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              </>);
            })()}

            {/* Upload new InBody */}

          </div>
          );
        })()}

        {/* ══ LABS ══ */}
        {tab==="labs" && (
          <div>
            {/* Upload new labs */}
            <div className="sec-h">Agregar Nuevos Resultados de Laboratorio</div>
            <p style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"10px",color:"#44445a",marginBottom:16,lineHeight:1.5,letterSpacing:".04em"}}>Resultados de laboratorio: lípidos, glucosa, hemograma y marcadores clave.</p>
            <div className="card" style={{marginBottom:20}}>
              <p style={{fontSize:12,color:"#8888a8",marginBottom:14,lineHeight:1.6}}>
                Sube una foto de tu resultado de laboratorio y la IA extraerá automáticamente todos los valores disponibles.
              </p>
              <div className={`photo-zone upload-zone${labsB64?" has-img":""}`} style={{marginBottom:10}}>
                <input ref={labsImgRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{
                  const f=e.target.files[0]; if(!f) return;
                  const r=new FileReader(); r.onload=ev=>setLabsB64(ev.target.result.split(",")[1]); r.readAsDataURL(f);
                }}/>
                {labsB64
                  ? <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"10px",color:"#a8ff3e"}}>🔬 Imagen cargada · Listo para analizar</div>
                  : <><div style={{fontSize:28,marginBottom:6}}>🔬</div>
                     <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"10px",color:"#8888a8",letterSpacing:".1em"}}>SUBIR FOTO DE RESULTADOS DE LABS</div></>
                }
              </div>
              {labsB64 && (
                <div style={{display:"flex",gap:8}}>
                  <button className="btn" style={{flex:1}} onClick={parseLabsUpload} disabled={labsLoading}>
                    {labsLoading?<span>LEYENDO LABS <span className="dots"><span/><span/><span/></span></span>:"🔍 LEER CON IA"}
                  </button>
                  <button className="btn-sm" onClick={()=>{setLabsB64(null);setLabsResult(null);}}>✕</button>
                </div>
              )}
              {/* Manual Labs entry */}
              <button className="btn-sm" style={{marginTop:10,marginBottom:4,fontSize:"9px",background:"#1a1a22",border:"1px solid #2a2a38",color:"#8888a8"}}
                onClick={()=>setShowManualLabs(v=>!v)}>
                ✏️ {showManualLabs?"CANCELAR":"INGRESAR DATOS MANUALMENTE"}
              </button>
              {showManualLabs && (
                <div className="card fade-in" style={{marginBottom:12,border:"1px solid #2a2a38"}}>
                  <div className="lbl" style={{marginBottom:10}}>📝 ENTRADA MANUAL — LABORATORIOS</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                    <input type="text" placeholder="Fecha (YYYY-MM) *" value={manualLabs.date}
                      onChange={e=>setManualLabs(p=>({...p,date:e.target.value}))} className="inp" style={{fontSize:11,gridColumn:"1/-1"}}/>
                    {[
                      ["ldl","LDL (mg/dL)"],["hdl","HDL (mg/dL)"],["tc","Col. Total (mg/dL)"],["tg","Triglicéridos (mg/dL)"],
                      ["hba1c","HbA1c (%)"],["glucose","Glucosa (mg/dL)"],["insulin","Insulina (μUI/mL)"],
                      ["psa","PSA (ng/mL)"],["creatinina","Creatinina (mg/dL)"],["ggt","GGT (U/L)"],
                      ["acido_urico","Ácido Úrico (mg/dL)"],["hb","Hemoglobina (g/dL)"],
                      ["vcm","VCM (fL)"],["hcm","HCM (pg)"],["leucocitos","Leucocitos (mil/μL)"],
                    ].map(([k,placeholder])=>(
                      <input key={k} type="number" step="0.01" placeholder={placeholder}
                        value={manualLabs[k]} onChange={e=>setManualLabs(p=>({...p,[k]:e.target.value}))}
                        className="inp" style={{fontSize:11}}/>
                    ))}
                    {/* Otro lab */}
                    <div style={{gridColumn:"1/-1",fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:"#44445a",letterSpacing:".1em",marginTop:6,marginBottom:2}}>
                      OTRO INDICADOR (opcional)
                    </div>
                    <input placeholder="Nombre (ej: Vitamina D, Ferritina, TSH...)" value={manualLabs.otro_label}
                      onChange={e=>setManualLabs(p=>({...p,otro_label:e.target.value}))} className="inp" style={{fontSize:11,gridColumn:"1/-1"}}/>
                    <input type="number" step="0.01" placeholder="Valor" value={manualLabs.otro_valor}
                      onChange={e=>setManualLabs(p=>({...p,otro_valor:e.target.value}))} className="inp" style={{fontSize:11}}/>
                    <input placeholder="Unidad (ej: ng/mL, pg/mL, mIU/L)" value={manualLabs.otro_unidad}
                      onChange={e=>setManualLabs(p=>({...p,otro_unidad:e.target.value}))} className="inp" style={{fontSize:11}}/>
                  </div>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#44445a",marginBottom:8}}>
                    * Solo ingresa los valores que tengas disponibles. Fecha obligatoria.
                  </div>
                  <button className="btn" style={{width:"100%"}} onClick={saveManualLabs}>✓ GUARDAR RESULTADOS</button>
                </div>
              )}
              {labsResult?.error && <div style={{fontFamily:"'JetBrains Mono',monospace",color:"#ff4d4d",fontSize:11,marginTop:8}}>{labsResult.error}</div>}
              {labsResult && !labsResult.error && (
                <div style={{background:"#1a1a22",border:"1px solid #2a2a38",borderRadius:4,padding:14,marginTop:10}} className="fade-in">
                  <div className="lbl" style={{marginBottom:8}}>Valores extraídos ({labsResult.date||"—"}):</div>
                  <div className="g4" style={{marginBottom:10,gap:8}}>
                    {[["LDL",labsResult.ldl,"mg/dL"],["HDL",labsResult.hdl,"mg/dL"],["Col. Total",labsResult.tc,"mg/dL"],["TG",labsResult.tg,"mg/dL"],["HbA1c",labsResult.hba1c,"%"],["Glucosa",labsResult.glucose,"mg/dL"],["VCM",labsResult.vcm,"fL"],["HbG",labsResult.hemoglobin,"g/dL"]].filter(([,v])=>v!=null).map(([l,v,u])=>(
                      <div key={l} style={{background:"#131318",borderRadius:3,padding:"6px",textAlign:"center"}}>
                        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:"#44445a",marginBottom:2}}>{l}</div>
                        <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:16,color:"#4dc8ff"}}>{v}</div>
                        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:"#44445a"}}>{u}</div>
                      </div>
                    ))}
                  </div>
                  {labsResult.summary && <div style={{fontSize:12,color:"#8888a8",marginBottom:10,lineHeight:1.5}}>📋 {labsResult.summary}</div>}
                  <button className="btn" style={{width:"100%"}} onClick={confirmLabs}>✓ GUARDAR RESULTADOS</button>
                </div>
              )}
              {customLabs.length>0 && (
                <div style={{marginTop:14}}>
                  <div className="lbl" style={{marginBottom:8}}>Labs agregados manualmente:</div>
                  {customLabs.map((l,i)=>(
                    <div key={i} style={{background:"#1a1a22",borderRadius:3,padding:"8px 12px",marginBottom:6,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"10px",color:"#a8ff3e"}}>{l.date||"Sin fecha"}</div>
                      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"10px",color:"#8888a8"}}>
                        {l.ldl!=null&&`LDL:${l.ldl} `}{l.hba1c!=null&&`HbA1c:${l.hba1c}%`}
                      </div>
                      <button onClick={()=>saveCustomLabs(customLabs.filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:"#44445a",cursor:"pointer",fontSize:12}}>🗑</button>
                    </div>
                  ))}
                </div>
              )}
            </div>


            <div className="sec-h">Tendencia de Lípidos</div>
            <div className="card chart-wrap" style={{padding:"16px 10px",marginBottom:20}}>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={labResults} margin={{top:5,right:10,bottom:5,left:0}}>
                  <XAxis dataKey="date" tick={{fill:"#44445a",fontSize:9,fontFamily:"JetBrains Mono"}}/>
                  <YAxis tick={{fill:"#8888a8",fontSize:9}} domain={[50,350]}/>
                  <Tooltip contentStyle={{background:"#1a1a22",border:"1px solid #2a2a38",borderRadius:4,fontSize:11}}/>
                  <Legend wrapperStyle={{fontSize:10,fontFamily:"JetBrains Mono",color:"#8888a8"}}/>
                  <ReferenceLine y={100} stroke="#ff4d4d" strokeDasharray="3,3" label={{value:"LDL meta",fill:"#ff4d4d",fontSize:8}}/>
                  <ReferenceLine y={200} stroke="#ffb830" strokeDasharray="3,3" label={{value:"TC meta",fill:"#ffb830",fontSize:8}}/>
                  <Line type="monotone" dataKey="ldl" stroke="#ff4d4d" strokeWidth={2} dot={{r:4,fill:"#ff4d4d"}} name="LDL"/>
                  <Line type="monotone" dataKey="hdl" stroke="#3ddc84" strokeWidth={2} dot={{r:4,fill:"#3ddc84"}} name="HDL"/>
                  <Line type="monotone" dataKey="tc" stroke="#ffb830" strokeWidth={2} dot={{r:4,fill:"#ffb830"}} name="Col. Total"/>
                  <Line type="monotone" dataKey="tg" stroke="#a8ff3e" strokeWidth={2} dot={{r:4,fill:"#a8ff3e"}} name="Triglicéridos"/>
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="sec-h">Glucosa & Control Glucémico</div>
            <div className="g4" style={{marginBottom:20}}>
              {labResults.filter(r=>r.hba1c||r.glucose).flatMap(r=>[
                r.hba1c!=null && {key:`hba1c_${r.date}`, l:`HbA1c · ${r.date}`, v:r.hba1c, u:"%",
                  c:r.hba1c<5.7?"#3ddc84":r.hba1c<6.0?"#ffb830":"#ff4d4d",
                  ref:r.hba1c<5.7?"✓ Normal":r.hba1c<6.0?"Zona de riesgo · monitorear":"⚠ Prediabetes"},
                r.glucose!=null && {key:`gluc_${r.date}`, l:`Glucosa · ${r.date}`, v:r.glucose, u:"mg/dL",
                  c:r.glucose<100?"#3ddc84":r.glucose<126?"#ffb830":"#ff4d4d",
                  ref:r.glucose<100?"Normal (70–100)":r.glucose<126?"Prediabetes (100–125)":"⚠ Revisar"},
              ]).filter(Boolean).map(x=>(
                <div key={x.key} className="card" style={{borderTop:`2px solid ${x.c}`}}>
                  <div className="lbl">{x.l}</div>
                  <div className="bnum" style={{color:x.c,fontSize:38}}>{x.v}<span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:13,color:"#8888a8",marginLeft:2}}>{x.u}</span></div>
                  <div style={{fontSize:11,color:"#8888a8",marginTop:6}}>{x.ref}</div>
                </div>
              ))}
            </div>

            <div className="sec-h">Perfil Lipídico Completo — {labResults.length} Medición{labResults.length!==1?"es":""}</div>
            <div className="card tbl-wrap" style={{marginBottom:20}}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Parámetro</th>
                    {labResults.map(r=><th key={r.date}>{r.date}</th>)}
                    <th>Meta</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {key:"tc",   label:"Col. Total", meta:"<200", thresholds:[200,240]},
                    {key:"ldl",  label:"LDL",        meta:"<100", thresholds:[100,130]},
                    {key:"hdl",  label:"HDL",        meta:"40–100", thresholds:[60,40], invert:true},
                    {key:"tg",   label:"Triglicéridos", meta:"<150", thresholds:[150,200]},
                  ].map(({key,label,meta,thresholds,invert})=>{
                    const getColor = v => {
                      if(v==null) return "#44445a";
                      if(invert) return v>=thresholds[0]?"#3ddc84":v>=thresholds[1]?"#ffb830":"#ff4d4d";
                      return v<thresholds[0]?"#3ddc84":v<thresholds[1]?"#ffb830":"#ff4d4d";
                    };
                    return (
                      <tr key={key}>
                        <td><strong>{label}</strong></td>
                        {labResults.map(r=>(
                          <td key={r.date} className="mono" style={{color:getColor(r[key])}}>
                            {r[key]??'—'}
                          </td>
                        ))}
                        <td style={{fontSize:11,color:"#44445a",fontFamily:"'JetBrains Mono',monospace"}}>{meta}</td>
                      </tr>
                    );
                  })}
                  {labResults.some(r=>r.tc&&r.hdl) && (
                    <tr>
                      <td><strong>Ratio Col/HDL</strong></td>
                      {labResults.map(r=>{
                        const ratio = r.tc&&r.hdl ? (r.tc/r.hdl).toFixed(1) : null;
                        const c = !ratio?"#44445a":ratio<4.6?"#3ddc84":ratio<5?"#ffb830":"#ff4d4d";
                        return <td key={r.date} className="mono" style={{color:c}}>{ratio??'—'}</td>;
                      })}
                      <td style={{fontSize:11,color:"#44445a",fontFamily:"'JetBrains Mono',monospace"}}>&lt;4.6</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Hemograma — dynamic, only shown if user has hemograma data */}
            {labResults.some(l=>l.leucocitos!=null||l.vcm!=null) ? (()=>{
              const hLabs = labResults.filter(l=>l.leucocitos!=null||l.vcm!=null);
              const h1 = hLabs[0]; const h2 = hLabs[1]||null;
              const col1 = h1?.date||""; const col2 = h2?.date||"";
              const fmt = v=>v!=null?String(v):"—";
              const cmp = (v,lo,hi)=>v==null?"#8888a8":v>=lo&&v<=hi?"#3ddc84":v>hi?"#ffb830":"#ff4d4d";
              return (<>
              <div className="sec-h">Hemograma Completo</div>
              <div className="g2" style={{marginBottom:20}}>
                <div className="card" style={{borderTop:"2px solid #4dc8ff"}}>
                  <div className="lbl" style={{marginBottom:12}}>Serie Blanca (Leucocitos)</div>
                  <table className="tbl">
                    <thead><tr><th>Parámetro</th><th>{col1}</th>{h2&&<th>{col2}</th>}<th>Ref</th></tr></thead>
                    <tbody>
                      {[["Glóbulos Blancos","leucocitos",4.8,10.8],["Linfocitos %","linfocitos",20,43],["Neutrófilos %","neutrofilos",44.3,70]].map(([p,k,lo,hi])=>(
                        <tr key={p}>
                          <td>{p}</td>
                          <td className="mono" style={{color:cmp(h1?.[k],lo,hi)}}>{fmt(h1?.[k])}</td>
                          {h2&&<td className="mono" style={{color:cmp(h2[k],lo,hi)}}>{fmt(h2[k])}</td>}
                          <td style={{fontSize:10,color:"#44445a",fontFamily:"'JetBrains Mono',monospace"}}>{lo}–{hi}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="card" style={{borderTop:"2px solid #ff4d4d"}}>
                  <div className="lbl" style={{marginBottom:12}}>Serie Roja</div>
                  <table className="tbl">
                    <thead><tr><th>Parámetro</th><th>{col1}</th>{h2&&<th>{col2}</th>}<th>Ref</th></tr></thead>
                    <tbody>
                      {[["Hemoglobina","hb",13.5,17.9],["Hematocrito","hematocrito",41,53.7],["VCM","vcm",80,98.2],["HCM","hcm",26,34],["Plaquetas","plaquetas",150,450]].map(([p,k,lo,hi])=>(
                        <tr key={p}>
                          <td>{p}</td>
                          <td className="mono" style={{color:cmp(h1?.[k],lo,hi)}}>{fmt(h1?.[k])}</td>
                          {h2&&<td className="mono" style={{color:cmp(h2[k],lo,hi)}}>{fmt(h2[k])}</td>}
                          <td style={{fontSize:10,color:"#44445a",fontFamily:"'JetBrains Mono',monospace"}}>{lo}–{hi}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              </>);
            })() : null}

            {/* Otros Parámetros — dynamic from labResults */}
            {labResults.some(l=>l.psa!=null||l.creatinina!=null||l.ggt!=null||l.acido_urico!=null||l.otro!=null) && (
              <>
              <div className="sec-h">Otros Parámetros</div>
              <div className="g4" style={{marginBottom:20}}>
                {labResults[labResults.length-1] && [
                  labResults[labResults.length-1].psa!=null && {l:`PSA · ${labResults[labResults.length-1].date}`,v:labResults[labResults.length-1].psa,u:"ng/mL",ref:"Normal (0–3)",c:labResults[labResults.length-1].psa<3?"#3ddc84":"#ff4d4d"},
                  labResults[labResults.length-1].creatinina!=null && {l:`Creatinina · ${labResults[labResults.length-1].date}`,v:labResults[labResults.length-1].creatinina,u:"mg/dL",ref:"Función renal · 0.6–1.3",c:labResults[labResults.length-1].creatinina>=0.6&&labResults[labResults.length-1].creatinina<=1.3?"#3ddc84":"#ffb830"},
                  labResults[labResults.length-1].ggt!=null && {l:`GGT · ${labResults[labResults.length-1].date}`,v:labResults[labResults.length-1].ggt,u:"U/L",ref:"Función hepática · 5–55",c:labResults[labResults.length-1].ggt<=55?"#3ddc84":"#ff4d4d"},
                  labResults[labResults.length-1].acido_urico!=null && {l:`Ácido Úrico · ${labResults[labResults.length-1].date}`,v:labResults[labResults.length-1].acido_urico,u:"mg/dL",ref:"Sin riesgo gota · 4–7",c:labResults[labResults.length-1].acido_urico<=7?"#3ddc84":"#ffb830"},
                ].filter(Boolean).map(x=>(
                  <div key={x.l} className="card" style={{borderTop:`2px solid ${x.c}`}}>
                    <div className="lbl">{x.l}</div>
                    <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:36,color:x.c,lineHeight:1}}>{x.v}<span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:"#8888a8",marginLeft:2}}>{x.u}</span></div>
                    <div style={{marginTop:8}}><span style={{background:x.c==="#3ddc84"?"rgba(61,220,132,.1)":"rgba(255,77,77,.1)",color:x.c,borderRadius:2,padding:"2px 8px",fontSize:9,fontFamily:"'JetBrains Mono',monospace"}}>{x.c==="#3ddc84"?"NORMAL ✓":"REVISAR ⚠"}</span></div>
                    <div style={{fontSize:11,color:"#8888a8",marginTop:6}}>{x.ref}</div>
                  </div>
                ))}
                {/* Custom "otro" lab fields */}
                {labResults.filter(l=>l.otro).map((l,i)=>(
                  <div key={i} className="card" style={{borderTop:"2px solid #8888a8"}}>
                    <div className="lbl" style={{color:"#8888a8"}}>{l.otro.label} · {l.date}</div>
                    <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:36,color:"#e8e8f0",lineHeight:1}}>
                      {l.otro.valor}
                      <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:"#8888a8",marginLeft:2}}>{l.otro.unidad}</span>
                    </div>
                    <div style={{fontSize:11,color:"#44445a",marginTop:6}}>Indicador personalizado</div>
                  </div>
                ))}
              </div>
              </>
            )}

          </div>
        )}

        {/* ══ ENTRENA ══ */}
        {tab==="entrena" && (()=>{
          const printRoutine = () => {
            if (!generatedRoutine || generatedRoutine.error) return;
            const days = generatedRoutine.days || [];
            const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${generatedRoutine.title}</title>
<style>
  body{font-family:Arial,sans-serif;margin:20px;color:#111;font-size:13px}
  h1{font-size:20px;margin-bottom:4px}
  .sub{color:#666;font-size:11px;margin-bottom:18px}
  .day{margin-bottom:20px;page-break-inside:avoid}
  .day-header{background:#111;color:#fff;padding:6px 12px;display:flex;justify-content:space-between;border-radius:3px 3px 0 0}
  .day-title{font-weight:700;font-size:14px}
  .day-type{font-size:10px;letter-spacing:.1em;color:#a8ff3e}
  table{width:100%;border-collapse:collapse;border:1px solid #ddd}
  th{background:#f5f5f5;padding:6px 10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#555;border-bottom:1px solid #ddd}
  td{padding:7px 10px;border-bottom:1px solid #eee;vertical-align:top}
  .sets{font-family:monospace;font-weight:700;color:#333;white-space:nowrap}
  .notes{font-size:11px;color:#27ae60;margin-top:2px}
  .rest-day{background:#f9f9f9;padding:14px;text-align:center;color:#888;border:1px solid #ddd;border-radius:0 0 3px 3px}
  .footer{margin-top:24px;padding-top:12px;border-top:1px solid #ddd;font-size:10px;color:#888}
  @media print{body{margin:10px}.day{page-break-inside:avoid}}
</style></head><body>
<h1>${generatedRoutine.title}</h1>
<div class="sub">${generatedRoutine.description||""} · Generado ${new Date().toLocaleDateString('es')}</div>
${days.map(d=>{
  const isRest = d.type?.includes("DESCANSO")||d.type?.includes("REST")||!d.exercises?.length;
  return `<div class="day">
    <div class="day-header"><span class="day-title">${d.day}</span><span class="day-type">${d.type||""}</span></div>
    ${isRest
      ? `<div class="rest-day">🛌 Día de descanso activo — caminar, movilidad, stretching</div>`
      : `<table><thead><tr><th>#</th><th>Ejercicio</th><th>Series / Reps</th></tr></thead><tbody>
      ${(d.exercises||[]).map((ex,j)=>`<tr><td style="color:#888;font-size:11px">${j+1}</td><td><div style="font-weight:600">${ex.name}</div>${ex.notes?`<div class="notes">💡 ${ex.notes}</div>`:""}</td><td class="sets">${ex.sets}</td></tr>`).join("")}
      </tbody></table>`}
  </div>`;
}).join("")}
${generatedRoutine.notes?`<div class="footer"><strong>📝 Notas:</strong> ${generatedRoutine.notes}</div>`:""}
</body></html>`;
            const w = window.open("","_blank","width=800,height=600");
            w.document.write(html);
            w.document.close();
            setTimeout(()=>w.print(),400);
          };

          return (
          <div>
            {/* AI Routine Generator */}
            <div className="sec-h">Generador de Rutina con IA</div>
            <p style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"10px",color:"#44445a",marginBottom:16,lineHeight:1.5,letterSpacing:".04em"}}>Genera rutinas con IA basadas en tu perfil real. Guarda tu historial.</p>
            <div className="card" style={{marginBottom:20}}>
              <p style={{fontSize:12,color:"#8888a8",marginBottom:14,lineHeight:1.6}}>
                Describe lo que necesitas y la IA generará una rutina personalizada basada en tu equipo y objetivos actuales.
              </p>
              <textarea value={routineInput} onChange={e=>setRoutineInput(e.target.value)}
                placeholder="Ej: Quiero una rutina de 4 días enfocada en mejorar las piernas y reducir grasa visceral. Tengo 45 min por sesión. Incluye más trabajo de cardio en intervalos."
                rows={3} className="inp" style={{resize:"vertical",marginBottom:10}}/>
              <div style={{display:"flex",gap:8,marginBottom:generatedRoutine?14:0,flexWrap:"wrap"}}>
                <button className="btn" style={{flex:1}} onClick={generateRoutine} disabled={routineLoading||!routineInput.trim()}>
                  {routineLoading?<span>GENERANDO <span className="dots"><span/><span/><span/></span></span>:"⚡ GENERAR RUTINA CON IA"}
                </button>
                {generatedRoutine && !generatedRoutine.error && (
                  <button onClick={printRoutine} style={{
                    fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",letterSpacing:".1em",
                    padding:"0 14px",border:"1px solid #2a2a38",borderRadius:3,
                    background:"transparent",color:"#8888a8",cursor:"pointer",flexShrink:0
                  }}>🖨 IMPRIMIR</button>
                )}
                {routineTs && <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#44445a",alignSelf:"center",whiteSpace:"nowrap"}}>{fmtCacheAge(routineTs)}</span>}
              </div>
              {generatedRoutine?.error && <div style={{fontFamily:"'JetBrains Mono',monospace",color:"#ff4d4d",fontSize:11}}>{generatedRoutine.error}</div>}

              {/* ── COMPACT DAY-TABS VIEW ── */}
              {generatedRoutine && !generatedRoutine.error && (()=>{
                const days = generatedRoutine.days || [];
                const activeDayData = days[activeDay];
                const isRest = activeDayData?.type?.includes("DESCANSO")||activeDayData?.type?.includes("REST")||!activeDayData?.exercises?.length;
                const dayColors = ["#a8ff3e","#4dc8ff","#ffb830","#ff9940","#c084fc","#ff7a4d","#3ddc84"];
                return (
                  <div className="fade-in">
                    {/* Title + description */}
                    <div style={{marginBottom:14}}>
                      <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:20,marginBottom:3}}>{generatedRoutine.title}</div>
                      {generatedRoutine.description && <p style={{fontSize:11,color:"#8888a8",lineHeight:1.5,margin:0}}>{generatedRoutine.description}</p>}
                    </div>

                    {/* Day tabs row */}
                    <div style={{display:"flex",gap:4,marginBottom:14,overflowX:"auto",paddingBottom:4,WebkitOverflowScrolling:"touch"}}>
                      {days.map((d,i)=>{
                        const isRestDay = d.type?.includes("DESCANSO")||d.type?.includes("REST")||!d.exercises?.length;
                        const col = isRestDay?"#2a2a38":dayColors[i%dayColors.length];
                        const active = activeDay===i;
                        return (
                          <button key={i} onClick={()=>setActiveDay(i)} style={{
                            flexShrink:0,padding:"6px 10px",border:`1px solid ${active?col:"#2a2a38"}`,
                            borderRadius:3,cursor:"pointer",
                            background:active?col+"18":"transparent",
                            fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",letterSpacing:".06em",
                            color:active?col:"#44445a",transition:"all .12s",
                            borderBottom:active?`2px solid ${col}`:"1px solid #2a2a38",
                          }}>
                            <div style={{fontWeight:active?700:400}}>{d.day?.split(" ")[0]||`DÍA ${i+1}`}</div>
                            <div style={{fontSize:"7px",marginTop:1,opacity:.7,maxWidth:70,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                              {isRestDay?"DESCANSO":(d.type||"ENTRENO").slice(0,12)}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Active day content */}
                    {activeDayData && (
                      <div style={{background:"#0f0f16",border:"1px solid #2a2a38",borderRadius:4,overflow:"hidden"}}>
                        {/* Day header bar */}
                        <div style={{
                          background:isRest?"#1a1a22":`${dayColors[activeDay%dayColors.length]}12`,
                          borderBottom:"1px solid #2a2a38",
                          padding:"10px 14px",
                          display:"flex",justifyContent:"space-between",alignItems:"center"
                        }}>
                          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:16,color:"#e8e8f0"}}>{activeDayData.day}</div>
                          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",letterSpacing:".12em",
                            color:isRest?"#44445a":dayColors[activeDay%dayColors.length],textTransform:"uppercase"}}>
                            {activeDayData.type}
                          </div>
                        </div>

                        {/* Exercises table or rest */}
                        {isRest ? (
                          <div style={{padding:"24px",textAlign:"center"}}>
                            <div style={{fontSize:28,marginBottom:8}}>🛌</div>
                            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"10px",color:"#44445a"}}>
                              DESCANSO ACTIVO — Caminar 20-30 min · Movilidad · Stretching
                            </div>
                          </div>
                        ) : (
                          <div>
                            {/* Column headers */}
                            <div style={{display:"grid",gridTemplateColumns:"28px 1fr auto",gap:0,
                              padding:"6px 14px",borderBottom:"1px solid #1a1a22",
                              fontFamily:"'JetBrains Mono',monospace",fontSize:"7px",color:"#333348",letterSpacing:".12em"}}>
                              <span>#</span><span>EJERCICIO</span><span>SERIES / REPS</span>
                            </div>
                            {activeDayData.exercises?.map((ex,j)=>(
                              <div key={j} style={{
                                display:"grid",gridTemplateColumns:"28px 1fr auto",gap:0,
                                padding:"10px 14px",
                                borderBottom:"1px solid #1a1a220",
                                background:j%2===0?"transparent":"rgba(255,255,255,.015)",
                              }}>
                                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#333348",paddingTop:2}}>{j+1}</span>
                                <div style={{paddingRight:12}}>
                                  <div style={{fontFamily:"'Instrument Sans',sans-serif",fontWeight:600,fontSize:13,color:"#e8e8f0"}}>{ex.name}</div>
                                  {ex.notes && <div style={{fontSize:11,color:"#3ddc84",marginTop:2}}>💡 {ex.notes}</div>}
                                </div>
                                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"11px",fontWeight:700,
                                  color:dayColors[activeDay%dayColors.length],whiteSpace:"nowrap",paddingTop:2}}>{ex.sets}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Nav arrows */}
                    <div style={{display:"flex",justifyContent:"space-between",marginTop:10,gap:8}}>
                      <button onClick={()=>setActiveDay(d=>Math.max(0,d-1))} disabled={activeDay===0}
                        style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",padding:"6px 14px",
                          border:"1px solid #2a2a38",borderRadius:3,background:"transparent",
                          color:activeDay===0?"#2a2a38":"#8888a8",cursor:activeDay===0?"default":"pointer"}}>
                        ← ANTERIOR
                      </button>
                      <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:"#44445a",alignSelf:"center"}}>
                        {activeDay+1} / {days.length}
                      </span>
                      <button onClick={()=>setActiveDay(d=>Math.min(days.length-1,d+1))} disabled={activeDay===days.length-1}
                        style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",padding:"6px 14px",
                          border:"1px solid #2a2a38",borderRadius:3,background:"transparent",
                          color:activeDay===days.length-1?"#2a2a38":"#8888a8",cursor:activeDay===days.length-1?"default":"pointer"}}>
                        SIGUIENTE →
                      </button>
                    </div>

                    {generatedRoutine.notes && (
                      <div className="ins ib" style={{marginTop:12}}>
                        <strong>📝 Notas importantes</strong>
                        {generatedRoutine.notes}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* ── Rutinas Guardadas ── */}
            {savedRoutines.length>0 && (
              <div style={{marginBottom:20}}>
                <div className="sec-h">Rutinas Guardadas</div>
                <p style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"10px",color:"#44445a",marginBottom:16,lineHeight:1.5,letterSpacing:".04em"}}>Últimas rutinas generadas. Toca para volver a cargar.</p>
                {savedRoutines.map((r,i)=>(
                  <div key={r.savedAt||i} className="card" style={{marginBottom:8,cursor:"pointer",borderLeft:"3px solid #2a2a38",borderRadius:"0 4px 4px 0",padding:"12px 14px"}}
                    onClick={()=>{setGeneratedRoutine(r); setRoutineInput(r.request||"");}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                      <div>
                        <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,marginBottom:3}}>{r.title}</div>
                        {r.request && <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#44445a",lineHeight:1.4}}>"{r.request.slice(0,80)}{r.request.length>80?"...":""}"</div>}
                      </div>
                      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:"#44445a",flexShrink:0,textAlign:"right"}}>
                        {r.savedAt ? fmtCacheAge(r.savedAt) : ""}
                        <button onClick={e=>{e.stopPropagation();const ns=savedRoutines.filter((_,j)=>j!==i);setSavedRoutines(ns);if(user)setAiCache(user.id,"saved_routines",ns).catch(()=>{});}}
                          style={{display:"block",background:"none",border:"none",color:"#44445a",cursor:"pointer",fontSize:12,marginTop:4}}>🗑</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Perfil de Entrenamiento ── */}
            <div className="sec-h">Perfil & Configuración</div>
            <p style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"10px",color:"#44445a",marginBottom:16,lineHeight:1.5,letterSpacing:".04em"}}>Tu equipo, suplementos y objetivos alimentan el generador de rutinas. Edítalos en CONFIG.</p>
            <div className="g2" style={{marginBottom:20}}>
              <div className="card" style={{borderTop:"2px solid #a8ff3e"}}>
                <div className="lbl" style={{marginBottom:12}}>🏋️ Equipo Disponible</div>
                {userProfile.equipment.map((e,i)=>(
                  <div key={i} style={{padding:"5px 0",borderBottom:"1px solid rgba(42,42,56,.4)",fontSize:12,color:"#8888a8"}}>
                    <span style={{color:"#a8ff3e",marginRight:8}}>›</span>{e}
                  </div>
                ))}
              </div>
              <div className="card" style={{borderTop:"2px solid #4dc8ff"}}>
                <div className="lbl" style={{marginBottom:12}}>💊 Suplementos Actuales</div>
                {userProfile.supplements.map((s,i)=>(
                  <div key={i} style={{padding:"5px 0",borderBottom:"1px solid rgba(42,42,56,.4)",fontSize:12,color:"#8888a8"}}>
                    <span style={{color:"#4dc8ff",marginRight:8}}>›</span>{s}
                  </div>
                ))}
              </div>
            </div>
            <div className="card" style={{marginBottom:20,borderTop:"2px solid #ffb830"}}>
              <div className="lbl" style={{marginBottom:8}}>🎯 Objetivos & Contexto Clínico</div>
              <div style={{fontSize:12,color:"#8888a8",lineHeight:1.6}}>{userProfile.goals}</div>
              <div style={{fontSize:11,color:"#44445a",marginTop:8,fontFamily:"'JetBrains Mono',monospace"}}>{userProfile.health_notes}</div>
              <div style={{display:"flex",gap:16,marginTop:10}}>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#8888a8"}}>Duración: <strong style={{color:"#ffb830"}}>{userProfile.session_duration}</strong></div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#8888a8"}}>Días/semana: <strong style={{color:"#ffb830"}}>{userProfile.training_days}</strong></div>
              </div>
            </div>
          </div>
        )})()}

        {/* ══ GUÍA ══ */}
        {tab==="guia" && (()=>{
          // ── 7-day stats ──
          const days7 = Array.from({length:7},(_,i)=>{ const d=new Date(); d.setDate(d.getDate()-i); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; });
          const loggedDays7 = days7.filter(d=>(log[d]||[]).length>0);
          const allEntries7 = days7.flatMap(d=>log[d]||[]);
          const avg7 = loggedDays7.length>0 ? {
            calories: Math.round(allEntries7.reduce((s,e)=>s+(e.calories||0),0)/loggedDays7.length),
            protein:  Math.round(allEntries7.reduce((s,e)=>s+(e.protein||0),0)/loggedDays7.length),
            carbs:    Math.round(allEntries7.reduce((s,e)=>s+(e.carbs||0),0)/loggedDays7.length),
            fats:     Math.round(allEntries7.reduce((s,e)=>s+(e.fats||0),0)/loggedDays7.length),
          } : null;
          const gradeCount7 = {A:0,B:0,C:0,D:0,F:0};
          allEntries7.forEach(e=>{ if(e.grade && gradeCount7[e.grade]!==undefined) gradeCount7[e.grade]++; });
          const totalGraded7 = Object.values(gradeCount7).reduce((s,v)=>s+v,0);
          const abPct7 = totalGraded7>0 ? Math.round((gradeCount7.A+gradeCount7.B)/totalGraded7*100) : null;
          const dfPct7 = totalGraded7>0 ? Math.round((gradeCount7.D+gradeCount7.F)/totalGraded7*100) : null;

          // ── 14-day trend insights ──
          const days14 = Array.from({length:14},(_,i)=>{ const d=new Date(); d.setDate(d.getDate()-i); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; });
          const entries14 = days14.flatMap(d=>log[d]||[]);
          const loggedDays14 = days14.filter(d=>(log[d]||[]).length>0).length;
          const avgProtein14 = loggedDays14>0 ? Math.round(entries14.reduce((s,e)=>s+(e.protein||0),0)/loggedDays14) : 0;
          const avgKcal14   = loggedDays14>0 ? Math.round(entries14.reduce((s,e)=>s+(e.calories||0),0)/loggedDays14) : 0;
          const abCount14   = entries14.filter(e=>e.grade==="A"||e.grade==="B").length;
          const abPct14     = entries14.length>0 ? Math.round(abCount14/entries14.length*100) : 0;
          const prevInbody  = allInbody.length>1 ? allInbody[allInbody.length-2] : null;
          const muscleGain  = lastInbody && prevInbody ? (lastInbody.m - prevInbody.m).toFixed(1) : null;

          // ── Dynamic insights ──
          const insights = [];
          if(avgProtein14>0 && avgProtein14<targets.protein*0.85)
            insights.push({type:"warn",icon:"💪",title:"Proteína insuficiente",text:`Promedio ${avgProtein14}g/día vs meta ${targets.protein}g. Cada déficit proteico = menos recuperación muscular. Agrega fuente en snack mañana y post-entreno.`});
          if(avgKcal14>0 && avgKcal14>targets.calories*1.12)
            insights.push({type:"warn",icon:"⚡",title:"Exceso calórico sostenido",text:`Promedio ${avgKcal14} kcal vs meta ${targets.calories}. ${avgKcal14-targets.calories} kcal extra/día pueden revertir el déficit de grasa. Revisa las cenas.`});
          if(abPct14>0 && abPct14<50)
            insights.push({type:"bad",icon:"📊",title:"Calidad nutricional baja",text:`Solo ${abPct14}% de comidas en A/B estos 14 días. Impacta directamente LDL, HbA1c y recomposición. Foco en proteína magra + vegetales en cada comida principal.`});
          if(abPct14>=70)
            insights.push({type:"good",icon:"✅",title:"Consistencia excelente",text:`${abPct14}% de comidas A/B en 14 días. La consistencia es el principal driver de tu recomposición. Mantén el patrón.`});
          if(muscleGain>0)
            insights.push({type:"good",icon:"💪",title:`Masa muscular +${muscleGain}kg`,text:`Tu protocolo nutricional está funcionando. Sigue priorizando proteína post-entreno y mantén el superávit calórico moderado en días de entreno.`});

          // ── Detección de Estancamiento: compute outside JSX ──
          const plateauData = (()=>{
            const meas = allInbody.filter(r => r.d && r.w != null).slice(-6);
            if (meas.length < 2) return null;
            const recentW = meas.slice(-4).map(r => r.w);
            const wMax = Math.max(...recentW); const wMin = Math.min(...recentW);
            const wRange = parseFloat((wMax - wMin).toFixed(1));
            const recentF = meas.slice(-4).map(r => r.f).filter(v => v != null);
            const fRange = recentF.length >= 2 ? parseFloat((Math.max(...recentF) - Math.min(...recentF)).toFixed(1)) : null;
            const isWeightPlateau = wRange < 0.8;
            const isFatPlateau = fRange !== null && fRange < 0.6;
            const adherencia = abPct14;
            let status, color, icon, msg, advice;
            if (isWeightPlateau && isFatPlateau && adherencia >= 70) {
              status="Estancamiento real detectado"; color="#ff7a4d"; icon="⚠️";
              msg=`Peso osciló solo ${wRange} kg y grasa solo ${fRange}% en las últimas ${recentW.length} mediciones con ${adherencia}% de adherencia.`;
              advice="Opciones: refeed day 1×semana, semana de descarga en entreno, bajar 100-150 kcal, o cambiar distribución de macros.";
            } else if (isWeightPlateau && adherencia >= 70) {
              status="Peso estancado"; color="#ffb830"; icon="📊";
              msg=`Peso varía solo ${wRange} kg entre mediciones (${wMin}–${wMax} kg) con buena adherencia (${adherencia}%).`;
              advice="El peso puede estancarse mientras sigues recomponiendo (músculo ↑ grasa ↓). Revisa % grasa y masa muscular como métricas principales.";
            } else if (isWeightPlateau && adherencia < 60) {
              status="Peso estancado — tracking inconsistente"; color="#44445a"; icon="📋";
              msg=`Peso varía solo ${wRange} kg pero adherencia nutricional es ${adherencia}%.`;
              advice="El registro incompleto hace imposible detectar si hay estancamiento real. Registra todas las comidas por 7 días para tener datos fiables.";
            } else {
              status="Sin estancamiento"; color="#3ddc84"; icon="✅";
              msg=`Peso varía ${wRange} kg entre mediciones — hay movimiento activo.${fRange!=null?" Grasa varía "+fRange+"%.":""}`;
              advice="Sigue con el protocolo actual, hay progreso.";
            }
            return { status, color, icon, msg, advice, wRange, fRange, wMin, wMax, recentW, adherencia, isWeightPlateau };
          })();

          return (
          <div>
            {/* ── DETECCIÓN DE ESTANCAMIENTO — siempre visible ── */}
            {plateauData && (
              <div style={{marginBottom:20}}>
                <div className="sec-h">Detección de Estancamiento</div>
                <div className="card" style={{borderTop:`2px solid ${plateauData.color}`}}>
                  {/* Status row */}
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                    <span style={{fontSize:24,flexShrink:0}}>{plateauData.icon}</span>
                    <div style={{flex:1}}>
                      <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:16,color:plateauData.color}}>{plateauData.status}</div>
                      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#8888a8",marginTop:2,lineHeight:1.5}}>{plateauData.msg}</div>
                    </div>
                  </div>

                  {/* Mini weight chart — last measurements */}
                  {plateauData.recentW.length >= 2 && (()=>{
                    const vals = plateauData.recentW;
                    const PAD_T = 18, PAD_B = 8, PAD_L = 8, PAD_R = 8;
                    const W = 320, H = 60;
                    const plotW = W - PAD_L - PAD_R;
                    const plotH = H - PAD_T - PAD_B;
                    const minV = Math.min(...vals) - 0.3;
                    const maxV = Math.max(...vals) + 0.3;
                    const range = maxV - minV || 1;
                    const px = (i) => PAD_L + (vals.length === 1 ? plotW/2 : (i / (vals.length-1)) * plotW);
                    const py = (v) => PAD_T + plotH - ((v - minV) / range) * plotH;
                    const pts = vals.map((v,i) => `${px(i)},${py(v)}`).join(" ");
                    return (
                      <div style={{marginBottom:12}}>
                        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"7px",color:"#44445a",marginBottom:4,letterSpacing:".1em"}}>
                          ÚLTIMAS {vals.length} MEDICIONES — RANGO {plateauData.wMin}–{plateauData.wMax} kg (Δ{plateauData.wRange} kg)
                        </div>
                        <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:H*1.8,display:"block"}}>
                          {/* baseline */}
                          <line x1={PAD_L} y1={PAD_T+plotH} x2={W-PAD_R} y2={PAD_T+plotH} stroke="#2a2a38" strokeWidth="0.5"/>
                          {/* area fill */}
                          <polyline
                            points={[...vals.map((v,i)=>`${px(i)},${py(v)}`), `${px(vals.length-1)},${PAD_T+plotH}`, `${px(0)},${PAD_T+plotH}`].join(" ")}
                            fill={`${plateauData.color}12`} stroke="none"/>
                          {/* line */}
                          <polyline points={pts} fill="none" stroke={plateauData.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
                          {/* dots + labels */}
                          {vals.map((v,i) => {
                            const x = px(i), y = py(v);
                            const isTop = y < PAD_T + 10;
                            const labelY = isTop ? y + 14 : y - 7;
                            return (<g key={i}>
                              <circle cx={x} cy={y} r="4" fill={plateauData.color} stroke="#0c0c0f" strokeWidth="1.5"/>
                              <text x={x} y={labelY} textAnchor="middle" fontFamily="monospace" fontSize="9" fill="#e8e8f0" fontWeight="600">{v}</text>
                            </g>);
                          })}
                        </svg>
                      </div>
                    );
                  })()}

                  {/* Metrics pills */}
                  <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
                    <div style={{background:"#0c0c0f",borderRadius:3,padding:"7px 12px",fontFamily:"'JetBrains Mono',monospace"}}>
                      <div style={{fontSize:"7px",color:"#44445a",letterSpacing:".1em",marginBottom:2}}>VARIACIÓN PESO</div>
                      <div style={{fontSize:14,fontWeight:700,color:plateauData.wRange<0.8?"#ffb830":"#3ddc84"}}>Δ {plateauData.wRange} kg</div>
                    </div>
                    {plateauData.fRange !== null && (
                      <div style={{background:"#0c0c0f",borderRadius:3,padding:"7px 12px",fontFamily:"'JetBrains Mono',monospace"}}>
                        <div style={{fontSize:"7px",color:"#44445a",letterSpacing:".1em",marginBottom:2}}>VARIACIÓN GRASA</div>
                        <div style={{fontSize:14,fontWeight:700,color:plateauData.fRange<0.6?"#ffb830":"#3ddc84"}}>Δ {plateauData.fRange}%</div>
                      </div>
                    )}
                    <div style={{background:"#0c0c0f",borderRadius:3,padding:"7px 12px",fontFamily:"'JetBrains Mono',monospace"}}>
                      <div style={{fontSize:"7px",color:"#44445a",letterSpacing:".1em",marginBottom:2}}>ADHERENCIA 14D</div>
                      <div style={{fontSize:14,fontWeight:700,color:plateauData.adherencia>=70?"#3ddc84":plateauData.adherencia>=50?"#ffb830":"#ff7a4d"}}>
                        {plateauData.adherencia>0?`${plateauData.adherencia}%`:"Sin datos"}
                      </div>
                    </div>
                  </div>

                  {/* Advice box */}
                  <div style={{background:plateauData.isWeightPlateau?"rgba(255,122,77,.06)":"rgba(61,220,132,.06)",
                    border:`1px solid ${plateauData.isWeightPlateau?"rgba(255,122,77,.2)":"rgba(61,220,132,.2)"}`,
                    borderRadius:3,padding:"10px 12px"}}>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",
                      color:plateauData.isWeightPlateau?"#ff7a4d":"#3ddc84",letterSpacing:".1em",marginBottom:4}}>
                      {plateauData.isWeightPlateau?"💡 ACCIONES SUGERIDAS":"✓ CONTINÚA CON EL PROTOCOLO"}
                    </div>
                    <div style={{fontSize:12,color:"#8888a8",lineHeight:1.6}}>{plateauData.advice}</div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Macro targets ── */}
            <div className="sec-h">Metas de Macros — {isTrainingDay?"Día de Entreno":"Día de Descanso"}</div>
            <p style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"10px",color:"#44445a",marginBottom:16,lineHeight:1.5,letterSpacing:".04em"}}>Plan de referencia, metas de macros por tipo de día y suplementación.</p>
            <div className="g4" style={{marginBottom:20}}>
              {MACRO_KEYS.map(k=>(
                <div key={k} className="card" style={{borderTop:`2px solid ${MACRO_CFG[k].color}`}}>
                  <div className="lbl">Meta {MACRO_CFG[k].label}</div>
                  <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:34,color:MACRO_CFG[k].color,lineHeight:1}}>
                    {isTrainingDay?targets[k]:k==="calories"?Math.round(targets[k]*0.89):k==="carbs"?Math.round(targets[k]*0.75):targets[k]}
                    <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:"#8888a8",marginLeft:2}}>{MACRO_CFG[k].unit}</span>
                  </div>
                  {avg7 && (
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:"#44445a",marginTop:4}}>
                      Promedio real: {avg7[k]}{MACRO_CFG[k].unit}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* ── Plan de Referencia — solo si hay datos AI o log ── */}
            {Object.keys(log).length > 0 && (<>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8,marginBottom:4}}>
              <div className="sec-h" style={{marginBottom:0}}>Plan de Referencia — {isTrainingDay?"Día de Entreno":"Día de Descanso"}</div>
              <button onClick={()=>{
                const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Plan Alimenticio</title>
<style>
  body{font-family:Arial,sans-serif;margin:24px;color:#111;font-size:13px}
  h1{font-size:20px;margin-bottom:4px}
  .sub{color:#666;font-size:11px;margin-bottom:20px}
  .meal{margin-bottom:18px;page-break-inside:avoid;border:1px solid #ddd;border-radius:4px;overflow:hidden}
  .meal-header{background:#111;color:#fff;padding:8px 14px;display:flex;justify-content:space-between;align-items:center}
  .meal-title{font-weight:700;font-size:15px}
  .meal-time{font-size:10px;color:#aaa}
  .meal-macros{font-size:10px;color:#ffb830}
  table{width:100%;border-collapse:collapse}
  th{background:#f7f7f7;padding:6px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#555;border-bottom:1px solid #ddd}
  td{padding:8px 12px;border-bottom:1px solid #eee;vertical-align:top;font-size:12px}
  .why{color:#27ae60;font-style:italic}
  .totals{margin-top:16px;background:#f5f5f5;border-radius:4px;padding:12px 14px;display:flex;gap:20px;font-size:12px}
  .totals strong{color:#333;font-size:14px}
  .footer{margin-top:20px;font-size:10px;color:#888;border-top:1px solid #eee;padding-top:10px}
  @media print{body{margin:10px}.meal{page-break-inside:avoid}}
</style></head><body>
<h1>Plan Alimenticio — ${isTrainingDay?"Día de Entreno":"Día de Descanso"}</h1>
<div class="sub">Meta: ${targets.calories} kcal · Prot ${targets.protein}g · Carbs ${targets.carbs}g · Grasas ${targets.fats}g · Generado ${new Date().toLocaleDateString("es")}</div>
${PLAN_MEALS.map(m=>`
<div class="meal">
  <div class="meal-header">
    <div><span class="meal-title">${m.name}</span> <span class="meal-time">${m.time}</span></div>
    <span class="meal-macros">${m.kcal} kcal · P:${m.p}g · C:${m.c}g · G:${m.f}g</span>
  </div>
  <table><thead><tr><th>Alimento</th><th>Beneficio</th></tr></thead><tbody>
  ${m.items.map(it=>`<tr><td><strong>${it.n}</strong></td><td class="why">${it.why}</td></tr>`).join("")}
  </tbody></table>
</div>`).join("")}
<div class="totals">
  <div>Total aprox: <strong>${PLAN_MEALS.reduce((s,m)=>s+m.kcal,0)} kcal</strong></div>
  <div>Proteína: <strong>${PLAN_MEALS.reduce((s,m)=>s+m.p,0)}g</strong></div>
  <div>Carbos: <strong>${PLAN_MEALS.reduce((s,m)=>s+m.c,0)}g</strong></div>
  <div>Grasas: <strong>${PLAN_MEALS.reduce((s,m)=>s+m.f,0)}g</strong></div>
</div>
<div class="footer">Metabolic Health OS · Plan de referencia personalizado</div>
</body></html>`;
                const w = window.open("","_blank","width=800,height=700");
                w.document.write(html);
                w.document.close();
                setTimeout(()=>w.print(),400);
              }} style={{
                fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",letterSpacing:".1em",
                padding:"5px 14px",border:"1px solid #2a2a38",borderRadius:3,
                background:"transparent",color:"#8888a8",cursor:"pointer",flexShrink:0
              }}>🖨 IMPRIMIR PLAN</button>
            </div>
            {/* ── TIMELINE STORYLINE ── */}
            {(()=>{
              const mealColors = ["#ffb830","#4dc8ff","#a8ff3e","#ff9940","#c084fc"];
              const totalKcal  = PLAN_MEALS.reduce((s,m)=>s+m.kcal,0);
              const totalProt  = PLAN_MEALS.reduce((s,m)=>s+m.p,0);
              const totalCarbs = PLAN_MEALS.reduce((s,m)=>s+m.c,0);
              const totalFats  = PLAN_MEALS.reduce((s,m)=>s+m.f,0);
              return (
                <div style={{marginBottom:20}}>
                  {/* Day summary bar */}
                  <div style={{background:"#0f0f16",border:"1px solid #2a2a38",borderRadius:4,padding:"10px 14px",marginBottom:16,display:"flex",flexWrap:"wrap",gap:16,alignItems:"center"}}>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#44445a",letterSpacing:".1em",flexShrink:0}}>TOTAL DÍA</div>
                    {[
                      {l:"kcal",v:totalKcal,c:"#ffb830"},
                      {l:"prot",v:totalProt+"g",c:"#4dc8ff"},
                      {l:"carbs",v:totalCarbs+"g",c:"#a8ff3e"},
                      {l:"grasas",v:totalFats+"g",c:"#ff9940"},
                    ].map(x=>(
                      <div key={x.l} style={{display:"flex",alignItems:"baseline",gap:3}}>
                        <span style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:18,color:x.c,lineHeight:1}}>{x.v}</span>
                        <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:"#44445a"}}>{x.l}</span>
                      </div>
                    ))}
                    {/* Kcal bar breakdown */}
                    <div style={{flex:1,minWidth:120}}>
                      <div style={{height:4,borderRadius:2,background:"#1a1a22",overflow:"hidden",display:"flex",gap:1}}>
                        {PLAN_MEALS.map((m,i)=>(
                          <div key={i} style={{flex:m.kcal,background:mealColors[i%mealColors.length],opacity:.7}}/>
                        ))}
                      </div>
                      <div style={{display:"flex",gap:6,marginTop:3,flexWrap:"wrap"}}>
                        {PLAN_MEALS.map((m,i)=>(
                          <span key={i} style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"7px",color:mealColors[i%mealColors.length]}}>
                            ● {m.kcal}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* TIMELINE */}
                  <div style={{position:"relative",paddingLeft:52}}>
                    {/* Vertical connector line */}
                    <div style={{
                      position:"absolute",left:19,top:12,bottom:12,
                      width:2,background:"linear-gradient(to bottom,#ffb830,#4dc8ff,#a8ff3e,#ff9940,#c084fc)",
                      borderRadius:1,opacity:.25,
                    }}/>

                    {PLAN_MEALS.map((m,i)=>{
                      const col = mealColors[i%mealColors.length];
                      const pct = Math.round(m.kcal/totalKcal*100);
                      return (
                        <div key={m.name} style={{marginBottom: i<PLAN_MEALS.length-1 ? 0 : 0, position:"relative"}}>
                          {/* Node dot on line */}
                          <div style={{
                            position:"absolute",left:-33,top:16,
                            width:14,height:14,borderRadius:"50%",
                            background:col,
                            boxShadow:`0 0 0 3px #0c0c0f, 0 0 0 4px ${col}55`,
                            flexShrink:0,
                          }}/>

                          {/* Time badge above card */}
                          <div style={{
                            fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",
                            color:col,letterSpacing:".1em",marginBottom:4,
                            display:"flex",alignItems:"center",gap:6,
                          }}>
                            <span style={{fontWeight:700}}>{m.time}</span>
                            {m.highlight && <span style={{background:col+"22",color:col,padding:"1px 6px",borderRadius:2,fontSize:"7px"}}>COMIDA PRINCIPAL</span>}
                          </div>

                          {/* Card */}
                          <div style={{
                            background:"#0f0f16",
                            border:`1px solid ${col}33`,
                            borderLeft:`3px solid ${col}`,
                            borderRadius:"0 4px 4px 0",
                            marginBottom:20,
                            overflow:"hidden",
                          }}>
                            {/* Card header */}
                            <div style={{
                              padding:"10px 14px",
                              borderBottom:`1px solid ${col}18`,
                              background:`${col}06`,
                              display:"flex",justifyContent:"space-between",alignItems:"center",
                              flexWrap:"wrap",gap:8,
                            }}>
                              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:16,color:"#e8e8f0"}}>{m.name}</div>
                              <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
                                <span style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:16,color:col}}>{m.kcal}</span>
                                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:"#44445a"}}>kcal</span>
                                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#44445a"}}>
                                  P:{m.p}g · C:{m.c}g · G:{m.f}g
                                </span>
                                <div style={{width:36,height:4,borderRadius:2,background:"#1a1a22",overflow:"hidden"}}>
                                  <div style={{width:`${pct}%`,height:"100%",background:col,maxWidth:"100%"}}/>
                                </div>
                                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"7px",color:"#44445a"}}>{pct}%</span>
                              </div>
                            </div>

                            {/* Items */}
                            {m.items.map((it,j)=>(
                              <div key={j} style={{
                                padding:"9px 14px",
                                borderBottom: j<m.items.length-1 ? "1px solid rgba(42,42,56,.3)" : "none",
                                display:"flex",gap:10,alignItems:"flex-start",
                              }}>
                                <div style={{
                                  width:5,height:5,borderRadius:"50%",
                                  background:col,flexShrink:0,marginTop:5,opacity:.7,
                                }}/>
                                <div style={{flex:1}}>
                                  <div style={{fontSize:12,fontWeight:500,color:"#e8e8f0",lineHeight:1.4}}>{it.n}</div>
                                  <div style={{fontSize:11,color:"#3ddc84",marginTop:2,lineHeight:1.4,fontStyle:"italic"}}>
                                    {it.why}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* ── Suplementos ── */}
            <div className="sec-h">Suplementos — Timing Óptimo</div>
            <div className="g2" style={{marginBottom:20}}>
              <div className="card" style={{borderTop:"2px solid #ffb830"}}>
                <div className="lbl" style={{marginBottom:12}}>🌅 Mañana — con desayuno</div>
                <div style={{fontSize:12,color:"#8888a8",lineHeight:2.1}}>
                  ☀ <strong style={{color:"#e8e8f0"}}>Vitamina D3</strong> 2000–5000 UI · Con grasa<br/>
                  ☀ <strong style={{color:"#e8e8f0"}}>Vitamina C</strong> 500–1000mg · Antioxidante LDL<br/>
                  ☀ <strong style={{color:"#e8e8f0"}}>Zinc</strong> 15–25mg · No con calcio o hierro<br/>
                  ☀ <strong style={{color:"#e8e8f0"}}>Omega-3</strong> 2–4g EPA+DHA · Saltar con salmón
                </div>
              </div>
              <div className="card" style={{borderTop:"2px solid #4dc8ff"}}>
                <div className="lbl" style={{marginBottom:12}}>⚡ Post-Entreno · 🌙 Noche</div>
                <div style={{fontSize:12,color:"#8888a8",lineHeight:2.1}}>
                  ⚡ <strong style={{color:"#e8e8f0"}}>Creatina 5g</strong> · Con shake + banana<br/>
                  ⚡ <strong style={{color:"#e8e8f0"}}>Whey isolate 30g</strong> · Dentro de 45 min<br/>
                  🌙 <strong style={{color:"#e8e8f0"}}>Magnesio glicinato 400mg</strong> · 30 min antes de dormir<br/>
                  🌙 <strong style={{color:"#e8e8f0"}}>Rosuvastatina</strong> · Con cena · Síntesis nocturna
                </div>
              </div>
            </div>
            </>)}

            {/* ── Próximos pasos clínicos ── */}
            <div className="sec-h">Próximos Pasos Clínicos</div>
            <div className="card">
              {[
                lastInbody?.vi>=10 && {icon:"🚶",text:`Grasa visceral ${lastInbody?.vi} (meta <10) — caminar 15–20 min post-almuerzo todos los días`},
                lastInbody && lastInbody.m != null && lastInbody.m < (targets.muscleGoal||39) && {icon:"💪",text:`Masa muscular ${lastInbody?.m}kg — meta ${targets.muscleGoal||39}kg, priorizar proteína post-entreno`},
                avgProtein14>0 && avgProtein14<targets.protein*0.85 && {icon:"🥩",text:`Déficit de proteína (promedio ${avgProtein14}g vs meta ${targets.protein}g) — agrega fuente proteica en cada comida`},
                labResults.length>0 && labResults[labResults.length-1]?.hba1c>=5.7 && {icon:"🩺",text:`HbA1c ${labResults[labResults.length-1]?.hba1c}% — caminar 15 min post-almuerzo y reducir carbos simples`},
                {icon:"📊",text:"Check InBody cada 6–8 semanas para medir progreso"},
                labResults.length===0 && {icon:"🔬",text:"Agrega tus resultados de laboratorio en la sección LABS para recomendaciones personalizadas"},
              ].filter(Boolean).map((item,i)=>(
                <div key={i} style={{display:"flex",gap:12,padding:"10px 0",borderBottom:"1px solid rgba(42,42,56,.4)",alignItems:"flex-start"}}>
                  <span style={{fontSize:18,flexShrink:0}}>{item.icon}</span>
                  <span style={{fontSize:12,color:"#8888a8",lineHeight:1.5}}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
          );
        })()}


        {/* ══ HÁBITOS ══ */}
        {tab==="habitos" && (
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div className="sec-h" style={{margin:0}}>Hábitos — Adaptativo con IA</div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <button className="btn-sm" onClick={generateAiHabits}
                  disabled={aiHabitsLoading||(!!aiHabits&&!aiHabits.error&&!isCacheExpired(aiHabitsTs))}
                  style={{background:"#a8ff3e",color:"#080810",border:"none"}}>
                  {aiHabitsLoading?<span>Analizando<span className="dots"><span/><span/><span/></span></span>:isCacheExpired(aiHabitsTs)||!aiHabits?"⚡ ACTUALIZAR":"✓ LISTO"}
                </button>
                {aiHabitsTs && <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#44445a"}}>{fmtCacheAge(aiHabitsTs)}</span>}
                {aiHabits&&!aiHabitsLoading&&<button className="btn-sm" onClick={()=>{setAiHabits(null);setAiHabitsTs(null);if(user)setAiCache(user.id,"ai_habits",null).catch(()=>{});}} style={{fontSize:"8px",background:"#1a1a22",color:"#8888a8",border:"1px solid #2a2a38"}}>↻</button>}
              </div>
            </div>
            {/* AI Habits */}
            {aiHabits?.error && <div className="ins ir"><strong>Error</strong>{aiHabits.error}</div>}
            {aiHabits && !aiHabits.error ? (
              <div className="fade-in">
                {aiHabits.fecha_analisis && <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#44445a",marginBottom:14,letterSpacing:".1em"}}>ANÁLISIS: {aiHabits.fecha_analisis}</div>}
                {aiHabits.habitos?.map((h,i)=>{
                  const prioColor = h.prioridad==="CRÍTICO"?"#ff4d4d":h.prioridad==="IMPORTANTE"?"#ffb830":"#3ddc84";
                  return (
                    <div key={i} style={{display:"flex",gap:16,alignItems:"flex-start",background:"#1a1a22",border:`1px solid ${prioColor}30`,borderLeft:`3px solid ${prioColor}`,borderRadius:"0 4px 4px 0",padding:"16px 18px",marginBottom:10}}>
                      <div style={{fontSize:26,flexShrink:0,marginTop:2}}>{h.icono}</div>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15}}>{h.titulo}</div>
                          <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",padding:"2px 7px",borderRadius:2,background:`${prioColor}20`,color:prioColor,letterSpacing:".1em"}}>{h.prioridad}</span>
                        </div>
                        <div style={{fontSize:12,color:"#8888a8",lineHeight:1.6,marginBottom:8}}>{h.descripcion}</div>
                        <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                          {h.impacto?.map(tag=>(
                            <span key={tag} style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",padding:"2px 8px",borderRadius:2,background:"#4dc8ff18",color:"#4dc8ff",letterSpacing:".06em"}}>{tag}</span>
                          ))}
                          {h.badges?.map(tag=>(
                            <span key={tag} style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",padding:"2px 8px",borderRadius:2,background:"#a8ff3e18",color:"#a8ff3e",letterSpacing:".06em"}}>{tag}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {aiHabits.proximos_pasos_clinicos && (
                  <>
                    <div className="sec-h" style={{marginTop:20}}>Próximos Pasos Clínicos</div>
                    <div className="card">
                      {aiHabits.proximos_pasos_clinicos.map((paso,i)=>(
                        <div key={i} style={{display:"flex",gap:12,padding:"10px 0",borderBottom:"1px solid rgba(42,42,56,.4)"}}>
                          <span style={{color:"#a8ff3e",flexShrink:0,fontFamily:"'JetBrains Mono',monospace",fontSize:12}}>{i+1}.</span>
                          <span style={{fontSize:13,color:"#8888a8",lineHeight:1.5}}>{paso}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : !aiHabitsLoading && (
              <div>
                <div className="ins ib" style={{marginBottom:16}}>
                  <strong>💡 Hábitos con IA</strong>
                  Presiona "ACTUALIZAR" para que la IA analice tu log reciente y genere hábitos personalizados a tus marcadores y patrones de alimentación actuales.
                </div>
                <div style={{textAlign:"center",padding:"32px 0",color:"#44445a"}}>
                  <div style={{fontSize:36,marginBottom:12}}>🤖</div>
                  <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:16,marginBottom:8,color:"#44445a"}}>Sin hábitos generados aún</div>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"10px",lineHeight:1.7}}>
                    Registra al menos 3 días de comidas<br/>y presiona ACTUALIZAR para generar<br/>hábitos personalizados con IA.
                  </div>
                </div>
                {false && HABITS.map((h,i)=>(
                  <div key={i} style={{display:"flex",gap:16,alignItems:"flex-start",background:"#1a1a22",border:"1px solid #2a2a38",borderRadius:4,padding:"16px 18px",marginBottom:10}}>
                    <div style={{fontSize:26,flexShrink:0,marginTop:2}}>{h.icon}</div>
                    <div style={{flex:1}}>
                      <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,marginBottom:4}}>{h.title}</div>
                      <div style={{fontSize:12,color:"#8888a8",lineHeight:1.6,marginBottom:8}}>{h.desc}</div>
                      <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                        {h.badges.reduce((a,b,i,arr)=>{if(i%2===0)a.push([b,arr[i+1]]);return a;},[]).map(([c,l])=>(
                          <span key={l} style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",padding:"2px 8px",borderRadius:2,background:`${c}18`,color:c,letterSpacing:".06em"}}>{l}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ ANÁLISIS ══ */}
        {tab==="analisis" && (
          <div>

            {/* ── Alertas Automáticas (sin API) ── */}
            {(()=>{
              const _d14 = Array.from({length:14},(_,i)=>{ const d=new Date(); d.setDate(d.getDate()-i); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; });
              const _e14 = _d14.flatMap(d=>log[d]||[]);
              const _ld14 = _d14.filter(d=>(log[d]||[]).length>0).length;
              const avgP14 = _ld14>0?Math.round(_e14.reduce((s,e)=>s+(e.protein||0),0)/_ld14):0;
              const avgK14 = _ld14>0?Math.round(_e14.reduce((s,e)=>s+(e.calories||0),0)/_ld14):0;
              const abPct14 = _e14.length>0?Math.round(_e14.filter(e=>e.grade==="A"||e.grade==="B").length/_e14.length*100):0;
              const alerts = [];
              if(avgP14>0 && avgP14<targets.protein*0.85) alerts.push({type:"warn",icon:"💪",title:"Proteína insuficiente",text:`Promedio ${avgP14}g/día vs meta ${targets.protein}g. Agrega fuente proteica en snack y post-entreno.`});
              if(avgK14>0 && avgK14>targets.calories*1.12) alerts.push({type:"warn",icon:"⚡",title:"Exceso calórico sostenido",text:`Promedio ${avgK14} kcal vs meta ${targets.calories} (${avgK14-targets.calories} kcal extra/día). Revisa las cenas.`});
              if(abPct14>0 && abPct14<50) alerts.push({type:"bad",icon:"📊",title:"Calidad nutricional baja",text:`Solo ${abPct14}% de comidas en A/B (14 días). Impacta LDL, HbA1c y recomposición.`});
              if(abPct14>=70) alerts.push({type:"good",icon:"✅",title:"Consistencia excelente",text:`${abPct14}% de comidas A/B en 14 días. La consistencia es el principal driver de recomposición.`});
              if(alerts.length===0) return null;
              return (
                <div style={{marginBottom:20}}>
                  <div className="sec-h">Alertas Automáticas</div>
            <p style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"10px",color:"#44445a",marginBottom:16,lineHeight:1.5,letterSpacing:".04em"}}>Insights automáticos, Hall of Fame/Shame y análisis profundo con IA.</p>
                  {alerts.map((a,i)=>(
                    <div key={i} className={`ins ${a.type==="good"?"ig":a.type==="bad"?"ir":"iy"}`} style={{marginBottom:8}}>
                      <strong>{a.icon} {a.title}</strong>
                      <div style={{marginTop:4,fontWeight:400}}>{a.text}</div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* AI Analysis CTA */}

            {/* Divider */}

            {/* ── HALL OF FAME & SHAME ── */}
            {(() => {
              const all14 = Object.entries(log)
                .filter(([d])=>{ const cutoff=new Date(); cutoff.setDate(cutoff.getDate()-14); return d>=`${cutoff.getFullYear()}-${String(cutoff.getMonth()+1).padStart(2,'0')}-${String(cutoff.getDate()).padStart(2,'0')}`; })
                .flatMap(([d,entries])=>entries.map(e=>({...e,date:d})));
              if(all14.length<3) return null;
              const scored = all14.map(e=>({
                ...e,
                _score: (e.score||5)*10
                  + (e.grade==="A"?30:e.grade==="B"?15:e.grade==="C"?0:e.grade==="D"?-20:-35)
                  + (e.ldl_impact==="positivo"?15:e.ldl_impact==="negativo"?-15:0)
                  + (e.hba1c_impact==="positivo"?10:e.hba1c_impact==="negativo"?-10:0)
              }));
              const fame  = [...scored].sort((a,b)=>b._score-a._score).slice(0,3);
              const shame = [...scored].sort((a,b)=>a._score-b._score).slice(0,3);
              return (
                <div className="g2" style={{marginBottom:20}}>
                  <div>
                    <div className="sec-h">🏆 Hall of Fame — 14 días</div>
                    {fame.map((e,i)=>(
                      <div key={e.id||i} className="card" style={{marginBottom:8,borderLeft:"3px solid #3ddc84",borderRadius:"0 4px 4px 0",padding:"10px 14px"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                          <span style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:20,color:"#3ddc84"}}>#{i+1}</span>
                          <span style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:22,color:gradeColor(e.grade||"B")}}>{e.grade||"B"}</span>
                        </div>
                        <div style={{fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:13,marginBottom:4}}>{e.name}</div>
                        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#8888a8",marginBottom:3}}>
                          {e.meal&&<span style={{color:"#a8ff3e",marginRight:6}}>{e.meal}</span>}
                          <span style={{color:"#ffb830"}}>{e.calories}kcal</span> · <span style={{color:"#4dc8ff"}}>{e.protein}g P</span>
                        </div>
                        {e.notes && <div style={{fontSize:11,color:"#3ddc84"}}>💡 {e.notes}</div>}
                        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:"#44445a",marginTop:4}}>{e.date}</div>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="sec-h">💀 Hall of Shame — 14 días</div>
                    {shame.map((e,i)=>(
                      <div key={e.id||i} className="card" style={{marginBottom:8,borderLeft:"3px solid #ff4d4d",borderRadius:"0 4px 4px 0",padding:"10px 14px"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                          <span style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:20,color:"#ff4d4d"}}>#{i+1}</span>
                          <span style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:22,color:gradeColor(e.grade||"C")}}>{e.grade||"C"}</span>
                        </div>
                        <div style={{fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:13,marginBottom:4}}>{e.name}</div>
                        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#8888a8",marginBottom:3}}>
                          {e.meal&&<span style={{color:"#ff7a4d",marginRight:6}}>{e.meal}</span>}
                          <span style={{color:"#ffb830"}}>{e.calories}kcal</span> · <span style={{color:"#4dc8ff"}}>{e.protein}g P</span>
                        </div>
                        {e.alerta && <div style={{fontSize:11,color:"#ffb830"}}>⚠️ {e.alerta}</div>}
                        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:"#44445a",marginTop:4}}>{e.date}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* ── Análisis de Patrones con IA ── */}
            <div className="sec-h">Análisis de Patrones Nutricionales</div>
            <div style={{marginBottom:20}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                <button className="btn" style={{flex:1}} onClick={generateWeekInsights} disabled={weekInsightsLoading||(!isCacheExpired(weekInsightsTs)&&!!weekInsights&&!weekInsights.error)}>
                  {weekInsightsLoading?<span>ANALIZANDO <span className="dots"><span/><span/><span/></span></span>:isCacheExpired(weekInsightsTs)||!weekInsights?"🧠 ANALIZAR PATRONES (14 días)":"✓ ANALIZADO"}
                </button>
                {weekInsightsTs && <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#44445a",whiteSpace:"nowrap"}}>{fmtCacheAge(weekInsightsTs)}</span>}
                {weekInsights && !weekInsightsLoading && <button className="btn-sm" onClick={()=>{setWeekInsights(null);setWeekInsightsTs(null);if(user)setAiCache(user.id,"week_insights",null).catch(()=>{});}} style={{flexShrink:0,fontSize:"8px"}}>↻</button>}
              </div>
              {weekInsights && !weekInsights.error && (
                <div className="fade-in">
                  <div className="card" style={{borderLeft:"3px solid #a8ff3e",borderRadius:"0 4px 4px 0",marginBottom:10}}>
                    <div className="lbl" style={{marginBottom:8}}>Resumen de Patrones</div>
                    <p style={{fontSize:13,color:"#8888a8",lineHeight:1.6}}>{weekInsights.weekly_summary}</p>
                    <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}>
                      {weekInsights.grade_avg && <span style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:22,color:gradeColor(weekInsights.grade_avg)}}>{weekInsights.grade_avg}</span>}
                      {weekInsights.ldl_score && <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:impactColor(weekInsights.ldl_score),background:"#1a1a22",borderRadius:2,padding:"3px 8px"}}>LDL {impactArrow(weekInsights.ldl_score)} {weekInsights.ldl_score}</span>}
                      {weekInsights.hba1c_score && <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:impactColor(weekInsights.hba1c_score),background:"#1a1a22",borderRadius:2,padding:"3px 8px"}}>HbA1c {impactArrow(weekInsights.hba1c_score)} {weekInsights.hba1c_score}</span>}
                      {weekInsights.protein_compliance && <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#4dc8ff",background:"#1a1a22",borderRadius:2,padding:"3px 8px"}}>Proteína: {weekInsights.protein_compliance}</span>}
                    </div>
                  </div>
                  {weekInsights.pattern_alerts?.length>0 && (
                    <div className="ins ir" style={{marginBottom:8}}>
                      <strong>⚠ Patrones a corregir</strong>
                      {weekInsights.pattern_alerts.map((a,i)=><div key={i} style={{marginTop:4}}>• {a}</div>)}
                    </div>
                  )}
                  {weekInsights.pattern_wins?.length>0 && (
                    <div className="ins ig" style={{marginBottom:8}}>
                      <strong>✅ Hábitos positivos detectados</strong>
                      {weekInsights.pattern_wins.map((w,i)=><div key={i} style={{marginTop:4}}>• {w}</div>)}
                    </div>
                  )}
                  {(weekInsights.top_foods?.length>0||weekInsights.avoid_foods?.length>0) && (
                    <div className="g2">
                      {weekInsights.top_foods?.length>0 && (
                        <div className="card" style={{borderTop:"2px solid #3ddc84"}}>
                          <div className="lbl" style={{marginBottom:8}}>🏆 Mejores opciones</div>
                          {weekInsights.top_foods.map((f,i)=><div key={i} style={{fontSize:12,color:"#3ddc84",marginTop:4}}>✓ {f}</div>)}
                        </div>
                      )}
                      {weekInsights.avoid_foods?.length>0 && (
                        <div className="card" style={{borderTop:"2px solid #ff4d4d"}}>
                          <div className="lbl" style={{marginBottom:8}}>⚠ Reducir / eliminar</div>
                          {weekInsights.avoid_foods.map((f,i)=><div key={i} style={{fontSize:12,color:"#ff7a4d",marginTop:4}}>✗ {f}</div>)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {weekInsights?.error && <div style={{fontFamily:"'JetBrains Mono',monospace",color:"#ff4d4d",fontSize:11}}>{weekInsights.error}</div>}
            </div>

            <div style={{borderTop:"1px solid #2a2a38",margin:"24px 0"}}/>

            {/* Prompt to generate AI insights if none yet */}
            {!weekInsights && !weekInsightsLoading && (
              <div style={{textAlign:"center",padding:"24px 0",color:"#44445a"}}>
                <div style={{fontSize:32,marginBottom:10}}>🧠</div>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,color:"#44445a",marginBottom:6}}>Sin análisis generado aún</div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"10px",lineHeight:1.7}}>
                  Presiona "ANALIZAR PATRONES" arriba<br/>para generar insights personalizados con IA.
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ CONFIG ══ */}
        {tab==="score" && (()=>{
          const ms = calcMetabolicScore(labResults, allInbody, log, targets);
          const lab  = labResults[labResults.length-1] || null;
          const body = allInbody[allInbody.length-1]   || null;
          const scoreColor = !ms ? "#44445a" : ms.score>=80?"#3ddc84":ms.score>=65?"#ffb830":ms.score>=50?"#ff9940":"#ff4d4d";
          const statusLabel = !ms?"SIN DATOS":ms.score>=80?"ÓPTIMO":ms.score>=65?"BUENO":ms.score>=50?"MODERADO":"ATENCIÓN";

          return (
          <div className="fade-in" style={{padding:"28px 24px",maxWidth:700,margin:"0 auto"}}>

            {/* ── Semicircle Gauge ── */}
            {(()=>{
              const score = ms?.score ?? null;
              // Needle: 0→180deg mapped to score 0→100
              // SVG gauge: semicircle from 180° to 0° (left to right)
              const W=340, H=190, cx=W/2, cy=H-10, R=130, rInner=80;
              // Needle angle: score 0 = 180° (left), score 100 = 0° (right)
              const angleDeg = score!=null ? 180 - (score/100)*180 : 180;
              const angleRad = angleDeg * Math.PI / 180;
              const nx = cx + (R-10)*Math.cos(angleRad);
              const ny = cy - (R-10)*Math.sin(angleRad);
              // Derive real top-3 worst / best from ms.components
              const negItems = ms ? [...ms.components]
                .filter(x=>x.status!=="ok")
                .sort((a,b)=>{const rank={bad:0,warn:1};return (rank[a.status]??2)-(rank[b.status]??2);})
                .slice(0,3)
                .map(x=>x.label)
                : ["Sin datos suficientes"];
              const posItems = ms ? [...ms.components]
                .filter(x=>x.status==="ok")
                .slice(0,3)
                .map(x=>x.label)
                : ["Agrega labs e InBody"];
              return (
                <div style={{marginBottom:28}}>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#44445a",letterSpacing:".2em",marginBottom:16,textAlign:"center"}}>METABOLIC HEALTH SCORE</div>

                  {/* ── Gauge SVG (standalone, centered, no side text overlap) ── */}
                  <div style={{display:"flex",justifyContent:"center",marginBottom:10}}>
                    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"min(320px,100%)",height:"auto",overflow:"visible"}}>
                      <defs>
                        <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%"   stopColor="#ff6b6b"/>
                          <stop offset="45%"  stopColor="#ffb830"/>
                          <stop offset="72%"  stopColor="#d4f574"/>
                          <stop offset="100%" stopColor="#3ddc84"/>
                        </linearGradient>
                        <filter id="needleGlow">
                          <feGaussianBlur stdDeviation="2.5" result="blur"/>
                          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                        </filter>
                      </defs>
                      {/* Track bg */}
                      <path d={`M ${cx-R} ${cy} A ${R} ${R} 0 0 1 ${cx+R} ${cy}`}
                        fill="none" stroke="#1a1a22" strokeWidth="38"/>
                      {/* Colored arc */}
                      <path d={`M ${cx-R} ${cy} A ${R} ${R} 0 0 1 ${cx+R} ${cy}`}
                        fill="none" stroke="url(#gaugeGrad)" strokeWidth="36" strokeLinecap="butt" opacity="0.92"/>
                      {/* Inner dark cutout */}
                      <path d={`M ${cx-rInner} ${cy} A ${rInner} ${rInner} 0 0 1 ${cx+rInner} ${cy}`}
                        fill="#0c0c0f" stroke="none"/>
                      {/* Base line */}
                      <line x1={cx-R-10} y1={cy} x2={cx+R+10} y2={cy} stroke="#2a2a38" strokeWidth="1"/>
                      {/* End dots */}
                      <circle cx={cx-R} cy={cy} r="4" fill="#ff6b6b" opacity=".6"/>
                      <circle cx={cx+R} cy={cy} r="4" fill="#3ddc84" opacity=".6"/>
                      {/* Needle */}
                      {score!=null && (
                        <g filter="url(#needleGlow)">
                          <line x1={cx} y1={cy} x2={nx} y2={ny}
                            stroke="rgba(255,255,255,0.95)" strokeWidth="2.5" strokeLinecap="round"/>
                          <circle cx={cx} cy={cy} r="7" fill="#1a1a22" stroke="rgba(255,255,255,0.7)" strokeWidth="2"/>
                        </g>
                      )}
                      {/* Score number — inside the arc, not sitting on the arc */}
                      <text x={cx} y={cy-32} textAnchor="middle"
                        fontFamily="Syne,sans-serif" fontWeight="800" fontSize="44" fill={scoreColor}>
                        {score ?? "—"}
                      </text>
                      <text x={cx} y={cy-14} textAnchor="middle"
                        fontFamily="JetBrains Mono,monospace" fontSize="11" fill="#44445a">/ 100</text>
                      {/* Bajo / Óptimo — below the baseline, not on the arc */}
                      <text x={cx-R+2} y={cy+20} textAnchor="middle"
                        fontFamily="JetBrains Mono,monospace" fontSize="9" fill="#666680">Bajo</text>
                      <text x={cx+R-2} y={cy+20} textAnchor="middle"
                        fontFamily="JetBrains Mono,monospace" fontSize="9" fill="#666680">Óptimo</text>
                      {/* Status badge */}
                      <rect x={cx-38} y={cy+26} width="76" height="18" rx="3" fill={scoreColor+"22"}/>
                      <text x={cx} y={cy+38} textAnchor="middle"
                        fontFamily="Syne,sans-serif" fontWeight="700" fontSize="11" fill={scoreColor}>{statusLabel}</text>
                    </svg>
                  </div>

                  {/* ── Factors row — BELOW the gauge, no overlap ── */}
                  <div style={{display:"flex",justifyContent:"center",gap:16,flexWrap:"wrap",marginBottom:4}}>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:"#ff6b6b44",letterSpacing:".08em",marginBottom:5,textTransform:"uppercase"}}>
                        {ms ? "⚠ Área de mejora" : "Factores ⬇"}
                      </div>
                      {negItems.map(t=>(
                        <div key={t} style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"11px",color:"#ff8060",marginBottom:3,display:"flex",alignItems:"center",gap:4,justifyContent:"flex-end"}}>
                          <span>{t}</span><span style={{width:6,height:6,borderRadius:"50%",background:"#ff6b6b",display:"inline-block",flexShrink:0}}/>
                        </div>
                      ))}
                    </div>
                    <div style={{textAlign:"left"}}>
                      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:"#3ddc8444",letterSpacing:".08em",marginBottom:5,textTransform:"uppercase"}}>
                        {ms ? "✓ Indicadores ok" : "Factores ⬆"}
                      </div>
                      {posItems.map(t=>(
                        <div key={t} style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"11px",color:"#3ddc84",marginBottom:3,display:"flex",alignItems:"center",gap:4}}>
                          <span style={{width:6,height:6,borderRadius:"50%",background:"#3ddc84",display:"inline-block",flexShrink:0}}/><span>{t}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {ms && (<>

            {/* ── Components breakdown ── */}
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#44445a",letterSpacing:".2em",marginBottom:10}}>DESGLOSE POR COMPONENTE</div>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:24}}>
              {ms.components.map((comp,i)=>{
                const cColor = comp.status==="ok"?"#3ddc84":comp.status==="warn"?"#ffb830":"#ff4d4d";
                const barPct = comp.status==="ok"?85+Math.random()*15:comp.status==="warn"?50+Math.random()*20:15+Math.random()*25;
                return (
                  <div key={i} style={{background:"#131318",border:"1px solid #2a2a38",borderRadius:4,padding:"12px 16px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <div style={{width:6,height:6,borderRadius:"50%",background:cColor,flexShrink:0}}/>
                        <span style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:13,color:"#e8e8f0"}}>{comp.label}</span>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <span style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:cColor}}>{comp.value}</span>
                        <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:"#44445a"}}>meta: {comp.target}</span>
                      </div>
                    </div>
                    <div style={{height:3,background:"#1a1a22",borderRadius:2}}>
                      <div style={{height:3,background:cColor,borderRadius:2,width:`${Math.min(100,barPct)}%`,transition:"width 1s ease"}}/>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Edad Metabólica ── */}
            {(()=>{
              const REAL_AGE = userProfile.dob
                ? Math.floor((Date.now()-new Date(userProfile.dob).getTime())/(1000*60*60*24*365.25))
                : 39;
              // NHANES male reference norms — midpoints 25/32/42/52/62
              const NORMS = {
                ldl:    {ages:[25,32,42,52,62],vals:[98,115,125,128,126],lbetter:true,  label:"LDL",unit:"mg/dL", w:2.5},
                hba1c:  {ages:[25,32,42,52,62],vals:[5.2,5.3,5.45,5.65,5.85],lbetter:true, label:"HbA1c",unit:"%", w:2.5},
                fat_pct:{ages:[25,32,42,52,62],vals:[18,21,24,26,28],lbetter:true,  label:"% Grasa",unit:"%", w:2},
                tg:     {ages:[25,32,42,52,62],vals:[95,115,130,140,138],lbetter:true,  label:"TG",unit:"mg/dL", w:1},
                hdl:    {ages:[25,32,42,52,62],vals:[50,49,49,50,52],lbetter:false, label:"HDL",unit:"mg/dL", w:1},
              };
              function interpAge(norm, val) {
                const {ages,vals,lbetter} = norm;
                // extrapolate beyond bounds
                if (lbetter) {
                  if (val <= vals[0])  return ages[0] - (vals[0]-val)*1.5;
                  if (val >= vals[vals.length-1]) return ages[ages.length-1] + (val-vals[vals.length-1])*1.5;
                } else {
                  if (val >= vals[0])  return ages[0] - (val-vals[0])*1.5;
                  if (val <= vals[vals.length-1]) return ages[ages.length-1] + (vals[vals.length-1]-val)*1.5;
                }
                for (let i=0;i<ages.length-1;i++){
                  const a0=ages[i],a1=ages[i+1],v0=vals[i],v1=vals[i+1];
                  const inRange = lbetter ? (val>=v0&&val<=v1) : (val<=v0&&val>=v1);
                  if (inRange) {
                    const t=(val-v0)/(v1-v0);
                    return a0+t*(a1-a0);
                  }
                }
                return REAL_AGE;
              }
              const items=[];
              if(lab?.ldl)     items.push({...NORMS.ldl,    val:lab.ldl,    age:interpAge(NORMS.ldl,    lab.ldl)});
              if(lab?.hba1c)   items.push({...NORMS.hba1c,  val:lab.hba1c,  age:interpAge(NORMS.hba1c,  lab.hba1c)});
              if(body?.f)      items.push({...NORMS.fat_pct, val:body.f,    age:interpAge(NORMS.fat_pct, body.f)});
              if(lab?.tg)      items.push({...NORMS.tg,     val:lab.tg,     age:interpAge(NORMS.tg,     lab.tg)});
              if(lab?.hdl)     items.push({...NORMS.hdl,    val:lab.hdl,    age:interpAge(NORMS.hdl,    lab.hdl)});
              if(!items.length) return null;
              const totalW = items.reduce((s,x)=>s+x.w,0);
              const rawAge = items.reduce((s,x)=>s+x.age*x.w,0)/totalW;
              const metAge = Math.round(Math.max(18,Math.min(75,rawAge)));
              const delta  = metAge - REAL_AGE;
              const deltaCol = delta<=-3?"#3ddc84":delta<=2?"#ffb830":"#ff4d4d";
              const deltaLabel = delta<=-3?`${Math.abs(delta)} años más joven`:delta<=2?`Similar a tu edad`:` ${delta} años mayor`;
              // Ruler SVG
              const RULER_MIN=20, RULER_MAX=65;
              const toX = v => Math.max(0,Math.min(100,((v-RULER_MIN)/(RULER_MAX-RULER_MIN))*100));
              const realPct  = toX(REAL_AGE);
              const metPct   = toX(metAge);
              return (
                <div style={{marginBottom:24}}>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#44445a",letterSpacing:".2em",marginBottom:12}}>EDAD METABÓLICA</div>
                  <div style={{background:"#0f0f16",border:`1px solid ${deltaCol}22`,borderLeft:`3px solid ${deltaCol}`,borderRadius:"0 4px 4px 0",padding:"20px 20px 16px"}}>

                    {/* Header row */}
                    <div style={{display:"flex",alignItems:"flex-end",gap:16,flexWrap:"wrap",marginBottom:16}}>
                      <div>
                        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:"#44445a",marginBottom:4,letterSpacing:".1em"}}>EDAD METABÓLICA</div>
                        <div style={{display:"flex",alignItems:"baseline",gap:6}}>
                          <span style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:52,color:deltaCol,lineHeight:1}}>{metAge}</span>
                          <span style={{fontFamily:"'Syne',sans-serif",fontWeight:400,fontSize:18,color:"#44445a"}}>años</span>
                        </div>
                      </div>
                      <div style={{paddingBottom:6}}>
                        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:"#44445a",marginBottom:4}}>EDAD REAL</div>
                        <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:22,color:"#8888a8"}}>{REAL_AGE}</div>
                      </div>
                      <div style={{paddingBottom:8}}>
                        <div style={{background:deltaCol+"18",border:`1px solid ${deltaCol}33`,borderRadius:3,padding:"6px 12px"}}>
                          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"10px",color:deltaCol,fontWeight:700}}>{delta<0?"▼":delta===0?"→":"▲"} {deltaLabel}</div>
                        </div>
                      </div>
                    </div>

                    {/* Ruler */}
                    <div style={{position:"relative",height:36,marginBottom:16}}>
                      {/* Track */}
                      <div style={{position:"absolute",top:14,left:0,right:0,height:4,background:"#1a1a22",borderRadius:2}}/>
                      {/* Gradient fill between real and meta age */}
                      <div style={{
                        position:"absolute",top:14,
                        left:`${Math.min(realPct,metPct)}%`,
                        width:`${Math.abs(metPct-realPct)}%`,
                        height:4,
                        background:`linear-gradient(to right, ${delta<=0?"#3ddc84":"#ff4d4d"}, ${deltaCol})`,
                        borderRadius:2,
                      }}/>
                      {/* Real age pin */}
                      <div style={{position:"absolute",left:`${realPct}%`,transform:"translateX(-50%)",top:4}}>
                        <div style={{width:2,height:12,background:"#8888a8",margin:"0 auto"}}/>
                        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"7px",color:"#8888a8",textAlign:"center",marginTop:1,whiteSpace:"nowrap"}}>{REAL_AGE} real</div>
                      </div>
                      {/* Metabolic age pin */}
                      <div style={{position:"absolute",left:`${metPct}%`,transform:"translateX(-50%)",top:0}}>
                        <div style={{width:12,height:12,borderRadius:"50%",background:deltaCol,border:"2px solid #0c0c0f",margin:"0 auto"}}/>
                        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"7px",color:deltaCol,textAlign:"center",marginTop:2,whiteSpace:"nowrap",fontWeight:700}}>{metAge} metab</div>
                      </div>
                      {/* Scale labels */}
                      <div style={{position:"absolute",bottom:-2,left:0,fontFamily:"'JetBrains Mono',monospace",fontSize:"7px",color:"#44445a"}}>{RULER_MIN}</div>
                      <div style={{position:"absolute",bottom:-2,left:"50%",transform:"translateX(-50%)",fontFamily:"'JetBrains Mono',monospace",fontSize:"7px",color:"#44445a"}}>42</div>
                      <div style={{position:"absolute",bottom:-2,right:0,fontFamily:"'JetBrains Mono',monospace",fontSize:"7px",color:"#44445a"}}>{RULER_MAX}</div>
                    </div>

                    {/* Biomarker breakdown */}
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"7px",color:"#44445a",letterSpacing:".1em",marginBottom:8}}>APORTE POR BIOMARCADOR</div>
                    <div style={{display:"flex",flexDirection:"column",gap:5}}>
                      {items.map((it,i)=>{
                        const age = Math.round(Math.max(18,Math.min(75,it.age)));
                        const d   = age - REAL_AGE;
                        const col = d<=-3?"#3ddc84":d<=2?"#ffb830":"#ff4d4d";
                        const barPct = toX(age);
                        return (
                          <div key={i} style={{display:"flex",alignItems:"center",gap:8}}>
                            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#8888a8",width:54,flexShrink:0}}>{it.label}</div>
                            <div style={{flex:1,height:3,background:"#1a1a22",borderRadius:2,position:"relative"}}>
                              <div style={{position:"absolute",left:0,width:`${barPct}%`,height:3,background:col+"55",borderRadius:2}}/>
                              {/* real age marker */}
                              <div style={{position:"absolute",left:`${realPct}%`,width:1,height:3,background:"#44445a"}}/>
                            </div>
                            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:12,color:col,width:24,textAlign:"right",flexShrink:0}}>{age}</div>
                            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:"#44445a",width:52,flexShrink:0}}>{it.val}{it.unit}</div>
                          </div>
                        );
                      })}
                    </div>

                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"7px",color:"#2a2a38",marginTop:12}}>
                      Basado en normas NHANES (población masculina). Promedio ponderado por relevancia cardiometabólica.
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ── Advanced metrics ── */}
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#44445a",letterSpacing:".2em",marginBottom:10}}>MÉTRICAS AVANZADAS</div>
            <div className="g2" style={{gap:8,marginBottom:24}}>
              {/* TG/HDL */}
              {lab?.tg && lab?.hdl && (()=>{
                const ratio = +(lab.tg/lab.hdl).toFixed(2);
                const st = ratio<1.5?"ok":ratio<2.5?"warn":"bad";
                const col = st==="ok"?"#3ddc84":st==="warn"?"#ffb830":"#ff4d4d";
                return (
                  <div style={{background:"#131318",border:`1px solid ${col}22`,borderRadius:4,padding:"14px 16px"}}>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:"#44445a",letterSpacing:".1em",marginBottom:6}}>TG / HDL RATIO</div>
                    <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:28,color:col}}>{ratio}</div>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:"#44445a",marginTop:4}}>
                      {ratio<1.5?"✓ Excelente — bajo riesgo CV":ratio<2.5?"↑ Moderado — meta <1.5":"⚠ Alto — riesgo cardiometabólico"}
                    </div>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:"#44445a",marginTop:2}}>TG {lab.tg} · HDL {lab.hdl}</div>
                  </div>
                );
              })()}
              {/* HOMA-IR */}
              {lab?.glucose && lab?.insulin ? (()=>{
                const homa = +((lab.glucose * lab.insulin)/405).toFixed(2);
                const st = homa<1.5?"ok":homa<2.5?"warn":"bad";
                const col = st==="ok"?"#3ddc84":st==="warn"?"#ffb830":"#ff4d4d";
                return (
                  <div style={{background:"#131318",border:`1px solid ${col}22`,borderRadius:4,padding:"14px 16px"}}>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:"#44445a",letterSpacing:".1em",marginBottom:6}}>HOMA-IR</div>
                    <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:28,color:col}}>{homa}</div>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:"#44445a",marginTop:4}}>
                      {homa<1.0?"✓ Sensibilidad insulínica óptima":homa<1.5?"✓ Normal":homa<2.5?"↑ Resistencia leve — meta <1.5":"⚠ Resistencia a insulina"}
                    </div>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:"#44445a",marginTop:2}}>Glucosa {lab.glucose} · Insulina {lab.insulin}</div>
                  </div>
                );
              })() : (
                <div style={{background:"#131318",border:"1px solid #2a2a38",borderRadius:4,padding:"14px 16px",opacity:.5}}>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:"#44445a",letterSpacing:".1em",marginBottom:6}}>HOMA-IR</div>
                  <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:20,color:"#44445a"}}>—</div>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:"#44445a",marginTop:4}}>Requiere glucosa + insulina en ayunas</div>
                </div>
              )}
              {/* Protein adequacy */}
              {body && (()=>{
                const logDays = Object.keys(log).slice(-7);
                if (!logDays.length) return null;
                const avgProt = Math.round(logDays.reduce((a,d)=>a+(log[d]||[]).reduce((s,e)=>s+(e.protein||0),0),0)/logDays.length);
                const ratio = body.w ? +(avgProt/body.w).toFixed(2) : null;
                const st = !ratio?"ok":ratio>=1.6?"ok":ratio>=1.2?"warn":"bad";
                const col = st==="ok"?"#4dc8ff":st==="warn"?"#ffb830":"#ff4d4d";
                return (
                  <div style={{background:"#131318",border:`1px solid ${col}22`,borderRadius:4,padding:"14px 16px"}}>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:"#44445a",letterSpacing:".1em",marginBottom:6}}>PROTEÍNA / KG · PROM 7D</div>
                    <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:28,color:col}}>{ratio ?? "—"}<span style={{fontSize:14,fontWeight:400,color:"#44445a"}}> g/kg</span></div>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:"#44445a",marginTop:4}}>
                      {!ratio?"Sin datos":ratio>=1.6?"✓ Óptimo para recomposición":ratio>=1.2?"↑ Adecuado — meta 1.6–2.2 g/kg":"⚠ Bajo — aumenta proteína diaria"}
                    </div>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:"#44445a",marginTop:2}}>Prom {avgProt}g/d · Peso {body.w}kg</div>
                  </div>
                );
              })()}
            </div>


            {/* ── Wearables coming soon ── */}
            <div style={{background:"rgba(168,255,62,.03)",border:"1px dashed rgba(168,255,62,.15)",borderRadius:4,padding:"16px",marginBottom:24}}>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#a8ff3e",letterSpacing:".2em",marginBottom:6}}>PRÓXIMAMENTE — WEARABLES</div>
              <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                {["⌚ Apple Watch","💚 Garmin","⚫ Whoop","💍 Oura"].map(w=>(
                  <span key={w} style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:12,color:"#44445a",background:"#1a1a22",padding:"4px 10px",borderRadius:3}}>{w}</span>
                ))}
              </div>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:"#44445a",marginTop:8}}>
                Sueño · HRV · Resting HR · Actividad física → enriquecerán el Score Metabólico
              </div>
            </div>

            </>)}

            {!ms && (
              <div style={{textAlign:"center",padding:"40px 0"}}>
                <div style={{fontSize:40,marginBottom:12}}>🧬</div>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:18,color:"#44445a",marginBottom:8}}>Sin datos suficientes</div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"10px",color:"#44445a",lineHeight:1.7}}>
                  Agrega resultados de laboratorio en la sección LABS<br/>
                  o registra tu InBody en CUERPO para activar el Score.
                </div>
              </div>
            )}





          </div>
          );
        })()}


        {tab==="proyecciones" && (()=>{
          // ══ PROYECCIONES — fused Trayectoria + Forecasting ══
          function linRegP(points) {
            if (points.length < 2) return null;
            const n=points.length;
            const sumX=points.reduce((s,p)=>s+p.x,0), sumY=points.reduce((s,p)=>s+p.y,0);
            const sumXY=points.reduce((s,p)=>s+p.x*p.y,0), sumX2=points.reduce((s,p)=>s+p.x*p.x,0);
            const den=n*sumX2-sumX*sumX;
            if(!den) return null;
            const slope=(n*sumXY-sumX*sumY)/den;
            const intercept=(sumY-slope*sumX)/n;
            return {slope,intercept};
          }
          function toDaysP(dateStr){
            return new Date(dateStr.length===7?dateStr+"-15":dateStr).getTime()/86400000;
          }
          const nowDaysP = Date.now()/86400000;

          const LAB_META_P = {
            ldl:       {label:"LDL",           unit:"mg/dL", lbetter:true,  ref:100,  dec:0, icon:"🩸"},
            hdl:       {label:"HDL",           unit:"mg/dL", lbetter:false, ref:60,   dec:0, icon:"🛡"},
            tc:        {label:"Col. Total",    unit:"mg/dL", lbetter:true,  ref:200,  dec:0, icon:"💉"},
            tg:        {label:"Triglicéridos", unit:"mg/dL", lbetter:true,  ref:150,  dec:0, icon:"📉"},
            hba1c:     {label:"HbA1c",         unit:"%",     lbetter:true,  ref:5.7,  dec:2, icon:"🍬"},
            glucose:   {label:"Glucosa",       unit:"mg/dL", lbetter:true,  ref:100,  dec:0, icon:"📊"},
            insulin:   {label:"Insulina",      unit:"µU/mL", lbetter:true,  ref:10,   dec:1, icon:"💊"},
            uric_acid: {label:"Ácido Úrico",   unit:"mg/dL", lbetter:true,  ref:6.0,  dec:1, icon:"⚗"},
            creatinine:{label:"Creatinina",    unit:"mg/dL", lbetter:true,  ref:1.1,  dec:2, icon:"🔬"},
            ggt:       {label:"GGT",           unit:"U/L",   lbetter:true,  ref:50,   dec:0, icon:"🫀"},
            psa:       {label:"PSA",           unit:"ng/mL", lbetter:true,  ref:4.0,  dec:2, icon:"🔵"},
            hemoglobin:{label:"Hemoglobina",   unit:"g/dL",  lbetter:false, ref:14,   dec:1, icon:"🩺"},
            urea:      {label:"Urea",          unit:"mg/dL", lbetter:true,  ref:45,   dec:0, icon:"💧"},
          };

          // Body series
          const INDICATORS_P = [
            {key:"peso",    label:"Peso",          unit:"kg", icon:"⚖", lbetter:true,  ref:null, dec:1,
              pts: allInbody.filter(r=>r.w).map(r=>({x:toDaysP(r.d),y:r.w}))},
            {key:"grasa",   label:"% Grasa",       unit:"%",  icon:"🔥", lbetter:true,  ref:18,   dec:1,
              pts: allInbody.filter(r=>r.f).map(r=>({x:toDaysP(r.d),y:r.f}))},
            {key:"musculo", label:"Masa muscular", unit:"kg", icon:"💪", lbetter:false, ref:null, dec:1,
              pts: allInbody.filter(r=>r.m&&r.m>0).map(r=>({x:toDaysP(r.d),y:r.m}))},
            // Dynamic labs
            ...Object.entries(LAB_META_P).map(([key,meta])=>{
              const pts=labResults.filter(r=>r[key]!=null&&!isNaN(Number(r[key])))
                .map(r=>({x:toDaysP(r.date),y:Number(r[key])}))
                .sort((a,b)=>a.x-b.x);
              return pts.length>=2 ? {key,...meta,pts} : null;
            }).filter(Boolean),
          ].filter(ind=>ind.pts.length>=2);

          if (!INDICATORS_P.length) return (
            <div className="fade-in" style={{padding:"28px 24px",maxWidth:700,margin:"0 auto"}}>
              <div className="sec-h">Proyecciones</div>
              <div className="card" style={{textAlign:"center",padding:"40px 0",color:"#44445a"}}>
                <div style={{fontSize:40,marginBottom:12}}>📈</div>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:16,marginBottom:8}}>Sin datos suficientes</div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"10px",lineHeight:1.7}}>
                  Necesitas al menos 2 mediciones de InBody/Renpho<br/>o 2 resultados de labs para calcular proyecciones.
                </div>
              </div>
            </div>
          );

          const HORIZONS_P = [{label:"3M",days:90},{label:"6M",days:180},{label:"12M",days:365}];

          // Summary stats
          const regs = INDICATORS_P.map(ind=>({ind, reg:linRegP(ind.pts)}));
          const improving = regs.filter(({ind,reg})=>{
            if(!reg) return false;
            const s=reg.slope*30;
            return ind.lbetter ? s<-0.01 : s>0.01;
          }).length;
          const worsening = regs.filter(({ind,reg})=>{
            if(!reg) return false;
            const s=reg.slope*30;
            return ind.lbetter ? s>0.01 : s<-0.01;
          }).length;
          const stable = INDICATORS_P.length - improving - worsening;
          const oCol = improving>worsening?"#3ddc84":worsening>improving?"#ff4d4d":"#ffb830";
          const oLabel = improving>worsening?"↗ MEJORANDO":worsening>improving?"↘ DETERIORANDO":"→ ESTABLE";

          return (
            <div className="fade-in" style={{padding:"28px 24px",maxWidth:700,margin:"0 auto"}}>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#44445a",letterSpacing:".2em",marginBottom:14}}>PROYECCIONES — BASADAS EN TENDENCIA HISTÓRICA</div>

              {/* ── Summary header ── */}
              <div style={{background:"#0f0f16",border:`1px solid ${oCol}22`,borderLeft:`3px solid ${oCol}`,borderRadius:"0 4px 4px 0",padding:"14px 18px",marginBottom:20,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
                <div>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:oCol,letterSpacing:".15em",marginBottom:4}}>DIRECCIÓN GENERAL</div>
                  <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:20,color:oCol}}>{oLabel}</div>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#44445a",marginTop:4}}>
                    {INDICATORS_P.length} indicadores · si mantienes hábitos actuales
                  </div>
                </div>
                <div style={{display:"flex",gap:6}}>
                  {[{n:improving,l:"MEJOR",c:"#3ddc84"},{n:stable,l:"ESTABLE",c:"#8888a8"},{n:worsening,l:"PEOR",c:"#ff4d4d"}].map(x=>(
                    <div key={x.l} style={{background:"#131318",borderRadius:3,padding:"10px 14px",textAlign:"center",minWidth:48}}>
                      <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:26,color:x.c,lineHeight:1}}>{x.n}</div>
                      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"7px",color:"#44445a",marginTop:2}}>{x.l}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Per-indicator cards ── */}
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {regs.map(({ind,reg})=>{
                  if(!reg) return null;
                  const slopePerMonth = reg.slope*30;
                  const improving_i = ind.lbetter ? slopePerMonth<-0.01 : slopePerMonth>0.01;
                  const worsening_i = ind.lbetter ? slopePerMonth>0.01  : slopePerMonth<-0.01;
                  const tCol = improving_i?"#3ddc84":worsening_i?"#ff4d4d":"#ffb830";
                  const tIcon = improving_i?"↘":worsening_i?"↗":"→";
                  const tText = improving_i?(ind.lbetter?"↓ Mejorando":"↑ Mejorando"):worsening_i?(ind.lbetter?"↑ Empeorando":"↓ Empeorando"):"→ Estable";
                  const curVal = reg.intercept + reg.slope*nowDaysP;
                  const projections = HORIZONS_P.map(h=>({
                    ...h, val: reg.intercept+reg.slope*(nowDaysP+h.days)
                  }));

                  // Sparkline: real points + projected zone
                  const spark = ind.pts.slice(-8);
                  const proj12val = reg.intercept+reg.slope*(nowDaysP+365);
                  const allY=[...spark.map(p=>p.y),proj12val].filter(v=>v!=null&&!isNaN(v));
                  const minY=Math.min(...allY)*0.97, maxY=Math.max(...allY)*1.03;
                  const rangeY=maxY-minY||1;
                  const SW=240,SH=52,PAD=8;
                  const plotW=SW-PAD*2, plotH=SH-PAD*2;
                  const xMin=spark[0].x, xMax=nowDaysP+365, xRange=xMax-xMin||1;
                  const toSX=x=>PAD+((x-xMin)/xRange)*plotW;
                  const toSY=y=>PAD+plotH-((y-minY)/rangeY)*plotH;
                  const nowX=toSX(nowDaysP);
                  // Trend line: across full range
                  const tlx0=PAD, tly0=toSY(reg.intercept+reg.slope*xMin);
                  const tlx1=SW-PAD, tly1=toSY(reg.intercept+reg.slope*xMax);
                  // Real points
                  const realPolyline=spark.map(p=>`${toSX(p.x).toFixed(1)},${toSY(p.y).toFixed(1)}`).join(" ");
                  // Reference line
                  const refSY = ind.ref ? toSY(ind.ref) : null;

                  return (
                    <div key={ind.key} style={{
                      background:"#0f0f16",
                      border:`1px solid ${tCol}22`,
                      borderLeft:`3px solid ${tCol}`,
                      borderRadius:"0 4px 4px 0",
                      padding:"14px 16px",
                    }}>
                      <div style={{display:"flex",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>

                        {/* Label + current + trend */}
                        <div style={{flex:"0 0 130px"}}>
                          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:"#44445a",letterSpacing:".1em",marginBottom:4}}>
                            {ind.icon} {ind.label.toUpperCase()}
                          </div>
                          <div style={{display:"flex",alignItems:"baseline",gap:4,marginBottom:4}}>
                            <span style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:24,color:tCol,lineHeight:1}}>
                              {curVal.toFixed(ind.dec)}
                            </span>
                            <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:"#44445a"}}>{ind.unit}</span>
                          </div>
                          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:tCol}}>
                            {tIcon} {tText}
                          </div>
                          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"7px",color:"#44445a",marginTop:2}}>
                            {(slopePerMonth>=0?"+":"")+slopePerMonth.toFixed(ind.dec+1)}{ind.unit}/mes · {ind.pts.length} pts
                          </div>
                        </div>

                        {/* Sparkline: past + future on same axis */}
                        <div style={{flex:"0 0 240px"}}>
                          <svg viewBox={`0 0 ${SW} ${SH}`} style={{width:"100%",maxWidth:240,height:SH*1.8,display:"block"}}>
                            {/* Future zone */}
                            <rect x={nowX} y={PAD} width={SW-PAD-nowX} height={plotH}
                              fill={tCol+"08"} rx="0"/>
                            {/* Ref line */}
                            {refSY!==null&&refSY>=PAD&&refSY<=SH-PAD&&(
                              <line x1={PAD} y1={refSY} x2={SW-PAD} y2={refSY}
                                stroke="#44445a" strokeWidth="0.5" strokeDasharray="2,2"/>
                            )}
                            {/* Trend line (full — past faint, future clear) */}
                            <line x1={tlx0} y1={tly0} x2={nowX} y2={toSY(reg.intercept+reg.slope*nowDaysP)}
                              stroke={tCol} strokeWidth="0.8" strokeDasharray="2,2" opacity="0.3"/>
                            <line x1={nowX} y1={toSY(reg.intercept+reg.slope*nowDaysP)} x2={tlx1} y2={tly1}
                              stroke={tCol} strokeWidth="1.5" strokeDasharray="4,2" opacity="0.7"/>
                            {/* Area under real */}
                            {spark.length>1&&(
                              <polyline
                                points={[...spark.map(p=>`${toSX(p.x).toFixed(1)},${toSY(p.y).toFixed(1)}`),
                                  `${toSX(spark[spark.length-1].x).toFixed(1)},${(PAD+plotH).toFixed(1)}`,
                                  `${toSX(spark[0].x).toFixed(1)},${(PAD+plotH).toFixed(1)}`].join(" ")}
                                fill={tCol+"15"} stroke="none"/>
                            )}
                            {/* Real data line */}
                            <polyline points={realPolyline} fill="none" stroke={tCol}
                              strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
                            {/* Real dots */}
                            {spark.map((p,i)=>(
                              <circle key={i} cx={toSX(p.x)} cy={toSY(p.y)} r={i===spark.length-1?3.5:2}
                                fill={tCol} stroke="#0c0c0f" strokeWidth="1"/>
                            ))}
                            {/* NOW divider */}
                            <line x1={nowX} y1={PAD} x2={nowX} y2={SH-PAD}
                              stroke="#2a2a38" strokeWidth="1"/>
                          </svg>
                          {/* X axis labels */}
                          <div style={{display:"flex",justifyContent:"space-between",fontFamily:"'JetBrains Mono',monospace",fontSize:"6px",color:"#44445a",marginTop:1,paddingLeft:PAD,paddingRight:PAD}}>
                            <span>{spark[0]?new Date(spark[0].x*86400000).toLocaleDateString("es",{month:"short",year:"2-digit"}):""}  </span>
                            <span style={{color:"#2a2a38"}}>HOY</span>
                            <span>+12M</span>
                          </div>
                        </div>

                        {/* Projections 3M/6M/12M */}
                        <div style={{flex:1,minWidth:110}}>
                          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"7px",color:"#44445a",letterSpacing:".1em",marginBottom:6}}>PROYECCIÓN</div>
                          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                            {projections.map(p=>{
                              const delta=p.val-curVal;
                              const dCol=(ind.lbetter?delta<0:delta>0)?"#3ddc84":Math.abs(delta)<0.3?"#ffb830":"#ff4d4d";
                              const atRef=ind.ref&&(ind.lbetter?p.val<=ind.ref:p.val>=ind.ref);
                              return (
                                <div key={p.label} style={{
                                  background:atRef?dCol+"18":"#131318",
                                  border:`1px solid ${dCol}33`,
                                  borderRadius:3,padding:"7px 10px",textAlign:"center",minWidth:48,
                                }}>
                                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"7px",color:"#44445a",marginBottom:2}}>{p.label}</div>
                                  <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:dCol,lineHeight:1}}>{p.val.toFixed(ind.dec)}</div>
                                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"7px",color:dCol,marginTop:1}}>
                                    {(delta>=0?"+":"")+delta.toFixed(ind.dec)}
                                  </div>
                                  {atRef&&<div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"6px",color:dCol,marginTop:2}}>✓ META</div>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"7px",color:"#2a2a38",marginTop:12}}>
                Regresión lineal sobre datos históricos. Zona sombreada = futuro proyectado. Asume continuidad de hábitos actuales.
              </div>
            </div>
          );
        })()}

        {tab==="timeline" && (()=>{
          const today = todayStr();

          // ── Pre-clean ──
          const validInbody = allInbody.filter(r =>
            r.d <= today && r.w > 0 && (r.m == null || r.m > 0)
          );
          const allW = validInbody.map(r=>r.w).filter(Boolean);
          const allM = validInbody.map(r=>r.m).filter(v=>v!=null&&v>0);
          const allF = validInbody.map(r=>r.f).filter(v=>v!=null&&v>0);
          const peakW = allW.length ? Math.max(...allW) : null;
          const peakM = allM.length ? Math.max(...allM) : null;
          const minF  = allF.length ? Math.min(...allF) : null;
          const maxF  = allF.length ? Math.max(...allF) : null;

          const W_PCT=0.06, M_PCT=0.08, F_ABS=4.0, VI_THR=3;

          const filterBySource = (entries) => {
            const cleaned = entries.map((r,i) => {
              if (i===0 && entries.length>1) {
                const nx=entries[1];
                if (r.m>0 && nx.m>0 && Math.abs(r.m-nx.m)/nx.m>0.25) return {...r,m:null,_mSuspect:true};
              }
              return r;
            });
            const kept=[];
            cleaned.forEach((r,i)=>{
              const isFirst=i===0, isLast=i===cleaned.length-1;
              const isMilestone=r.w===peakW||(!r._mSuspect&&r.m>0&&r.m===peakM)||(r.f>0&&r.f===minF)||(r.f>0&&r.f===maxF);
              const ref=kept.length?kept[kept.length-1]:null;
              const pctW=(ref?.w>0&&r.w>0)?Math.abs(r.w-ref.w)/ref.w:0;
              const pctM=(ref?.m>0&&r.m>0)?Math.abs(r.m-ref.m)/ref.m:0;
              const absF=(ref?.f>0&&r.f>0)?Math.abs(r.f-ref.f):0;
              const absVI=(ref?.vi!=null&&r.vi!=null)?Math.abs(r.vi-ref.vi):0;
              const triggered=pctW>=W_PCT||pctM>=M_PCT||absF>=F_ABS||absVI>=VI_THR;
              const reasons=[];
              if(isFirst)reasons.push("Punto de partida");
              if(isLast&&!isFirst)reasons.push("Estado actual");
              if(r.w===peakW)reasons.push(`Peso máximo (${r.w} kg)`);
              if(!r._mSuspect&&r.m>0&&r.m===peakM)reasons.push(`Récord músculo (${r.m} kg)`);
              if(r.f>0&&r.f===minF)reasons.push(`Mínimo % grasa (${r.f}%)`);
              if(r.f>0&&r.f===maxF)reasons.push(`Peor % grasa (${r.f}%)`);
              if(triggered&&ref){
                if(pctW>=W_PCT){const d=r.w-ref.w,p=(d/ref.w*100).toFixed(0);reasons.push(`Peso ${d>0?"+":""}${d.toFixed(1)} kg (${d>0?"+":""}${p}%) vs ${fmtD(ref.d)}`);}
                if(pctM>=M_PCT&&!r._mSuspect){const d=r.m-ref.m,p=(d/ref.m*100).toFixed(0);reasons.push(`Músculo ${d>0?"+":""}${d.toFixed(1)} kg (${d>0?"+":""}${p}%) vs ${fmtD(ref.d)}`);}
                if(absF>=F_ABS){const d=r.f-ref.f;reasons.push(`Grasa ${d>0?"+":""}${d.toFixed(1)} pp vs ${fmtD(ref.d)}`);}
                if(absVI>=VI_THR)reasons.push(`Visceral ${ref.vi}→${r.vi}`);
              }
              if(isFirst||isLast||isMilestone||triggered)kept.push({...r,_reasons:reasons});
            });
            return kept;
          };

          const srcGroups={};
          validInbody.forEach(r=>{const s=r.source||"inbody";if(!srcGroups[s])srcGroups[s]=[];srcGroups[s].push(r);});
          const importantInbody=Object.values(srcGroups).flatMap(g=>filterBySource(g)).sort((a,b)=>a.d.localeCompare(b.d));

          const events=[];
          importantInbody.forEach(r=>{
            const flags=[];
            if(r.w===peakW)flags.push({icon:"⚖️",txt:"Peso máximo",col:"#ff7a4d"});
            if(!r._mSuspect&&r.m>0&&r.m===peakM)flags.push({icon:"💪",txt:"Récord músculo",col:"#3ddc84"});
            if(r.f>0&&r.f===minF)flags.push({icon:"🔥",txt:"Mínimo grasa",col:"#a8ff3e"});
            if(r.f>0&&r.f===maxF)flags.push({icon:"⚠️",txt:"Peor % grasa",col:"#ff4d4d"});
            const src=r.source||"inbody";
            const srcCol={inbody:"#4dc8ff",renpho:"#a8ff3e",manual:"#8888a8"}[src]||"#4dc8ff";
            events.push({date:r.d,type:"body",icon:"📊",color:srcCol,
              title:`${r.w}kg · ${r.m??'—'}kg M · ${r.f??'—'}% G${r.vi?` · V${r.vi}`:""}`,
              reason:r._reasons?.length?r._reasons.join(" · "):null,flags,data:r});
          });

          labResults.filter(r=>{
            const mm={Ene:"01",Feb:"02",Mar:"03",Abr:"04",May:"05",Jun:"06",Jul:"07",Ago:"08",Sep:"09",Oct:"10",Nov:"11",Dic:"12"};
            let dn=r.date; const lm=r.date?.match(/^([A-Za-z]+)\s+(\d{4})$/);
            if(lm)dn=`${lm[2]}-${mm[lm[1]]||"01"}-01`;
            else if(/^\d{4}-\d{2}$/.test(r.date))dn=r.date+"-01";
            return dn<=today;
          }).forEach(r=>{
            const lf=[];
            if(r.ldl){if(r.ldl>190)lf.push({icon:"🔴",txt:`LDL crítico ${r.ldl}`,col:"#ff4d4d"});else if(r.ldl>130)lf.push({icon:"🟡",txt:`LDL ${r.ldl}`,col:"#ffb830"});else if(r.ldl<=100)lf.push({icon:"✅",txt:`LDL óptimo ${r.ldl}`,col:"#3ddc84"});}
            if(r.hba1c){if(r.hba1c>=6.5)lf.push({icon:"🔴",txt:`HbA1c ${r.hba1c}%`,col:"#ff4d4d"});else if(r.hba1c>=5.7)lf.push({icon:"🟡",txt:`Prediabetes ${r.hba1c}%`,col:"#ffb830"});else lf.push({icon:"✅",txt:`HbA1c ${r.hba1c}%`,col:"#3ddc84"});}
            const mm={Ene:"01",Feb:"02",Mar:"03",Abr:"04",May:"05",Jun:"06",Jul:"07",Ago:"08",Sep:"09",Oct:"10",Nov:"11",Dic:"12"};
            let dn=r.date; const lm=r.date?.match(/^([A-Za-z]+)\s+(\d{4})$/);
            if(lm)dn=`${lm[2]}-${mm[lm[1]]||"01"}-01`;
            else if(/^\d{4}-\d{2}$/.test(r.date))dn=r.date+"-01";
            events.push({date:dn,type:"lab",icon:"🩸",color:"#ff9940",
              title:`LDL ${r.ldl??'—'} · HDL ${r.hdl??'—'} · TC ${r.tc??'—'}${r.hba1c?` · HbA1c ${r.hba1c}%`:""}`,
              subtitle:r.date,flags:lf});
          });

          const photoByMonth={};
          bodyPhotos.forEach(p=>{const mo=(p.date||"").slice(0,7);if(!photoByMonth[mo]||p.date>photoByMonth[mo].date)photoByMonth[mo]=p;});
          Object.values(photoByMonth).forEach(p=>{
            events.push({date:p.date,type:"photo",icon:"📸",color:"#c084fc",
              title:"Foto de progreso",subtitle:p.note||null,flags:[],
              img:p.b64?`data:image/jpeg;base64,${p.b64}`:null});
          });

          events.sort((a,b)=>(a.date||"").localeCompare(b.date||""));
          const typeLabel={body:"MEDICIÓN",lab:"LAB",photo:"FOTO",milestone:"HITO"};

          return (
            <div>
              <div className="sec-h">Metabolic Timeline</div>
              <p style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"10px",color:"#44445a",marginBottom:16,lineHeight:1.6,letterSpacing:".04em"}}>
                Hitos cronológicos — Δ≥6% peso · Δ≥8% músculo · Δ≥4pp grasa (acumulado por fuente). Todos los labs.
              </p>

              {/* ── Source filter ── */}
              {(()=>{
                const srcOptions = [{k:'all',l:'TODAS'},{k:'inbody',l:'InBody'},{k:'renpho',l:'Renpho'},{k:'manual',l:'Manual'},{k:'lab',l:'Labs'},{k:'photo',l:'Fotos'}];
                const srcCol = {inbody:'#4dc8ff',renpho:'#a8ff3e',manual:'#8888a8',lab:'#ff9940',photo:'#c084fc'};
                return (
                  <div style={{display:'flex',gap:6,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
                    <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'8px',color:'#44445a',letterSpacing:'.1em',marginRight:4}}>FUENTE</span>
                    {srcOptions.map(o=>{
                      const active = tlSrc===o.k;
                      const col = srcCol[o.k]||'#8888a8';
                      return (
                        <button key={o.k} onClick={()=>setTlSrc(o.k)}
                          style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'8px',letterSpacing:'.06em',
                            padding:'4px 10px',borderRadius:3,border:`1px solid ${active?col:'#2a2a38'}`,
                            background:active?col+'22':'transparent',color:active?col:'#44445a',cursor:'pointer'}}>
                          {o.l}
                        </button>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Summary pills + filtered timeline */}
              {(()=>{
                const filtered = events.filter(e => {
                  if (tlSrc === 'all') return true;
                  if (e.type === 'lab')   return tlSrc === 'lab';
                  if (e.type === 'photo') return tlSrc === 'photo';
                  // body events: filter by source
                  const src = e.data?.source || 'inbody';
                  return tlSrc === src;
                });
                const bodyFiltered  = filtered.filter(e=>e.type==='body');
                const labFiltered   = filtered.filter(e=>e.type==='lab');
                const photoFiltered = filtered.filter(e=>e.type==='photo');
                return (
                  <>
                  {/* Count pills */}
                  <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap",alignItems:"center"}}>
                    {[[bodyFiltered.length,"Mediciones","#4dc8ff"],[labFiltered.length,"Labs","#ff9940"],[photoFiltered.length,"Fotos","#c084fc"]].map(([v,l,col])=>(
                      <div key={l} style={{background:"#131318",border:`1px solid ${col}33`,borderRadius:4,padding:"8px 14px",display:"flex",gap:8,alignItems:"center"}}>
                        <span style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:18,color:col}}>{v}</span>
                        <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#44445a",letterSpacing:".06em"}}>{l}</span>
                      </div>
                    ))}
                    {tlSrc!=='all' && (
                      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'8px',color:'#44445a',marginLeft:4}}>
                        {filtered.length} de {events.length} eventos
                      </div>
                    )}
                  </div>

                  {/* ── HORIZONTAL TIMELINE ── */}
                  {filtered.length===0 ? (
                    <div style={{textAlign:"center",padding:"32px 0",color:"#44445a",fontFamily:"'JetBrains Mono',monospace",fontSize:"10px"}}>
                      Sin eventos para esta fuente
                    </div>
                  ) : (
                    <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch",marginBottom:32,paddingBottom:8}}>
                      <div style={{display:"flex",alignItems:"flex-start",gap:0,minWidth:Math.max(filtered.length*160,320),position:"relative",paddingTop:8}}>
                        {/* Rail */}
                        <div style={{position:"absolute",top:24,left:20,right:20,height:2,
                          background:"linear-gradient(to right,#2a2a38,#a8ff3e55,#2a2a38)",zIndex:0}}/>
                        {filtered.map((evt,i)=>(
                          <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",position:"relative",zIndex:1,minWidth:150,maxWidth:220}}>
                            {/* Dot */}
                            <div style={{width:16,height:16,borderRadius:"50%",background:evt.color,
                              boxShadow:`0 0 8px ${evt.color}88`,border:"2px solid #0c0c0f",
                              marginBottom:10,flexShrink:0,zIndex:2}}/>
                            {/* Card */}
                            <div style={{background:"#131318",border:`1px solid ${evt.color}30`,
                              borderTop:`3px solid ${evt.color}`,borderRadius:4,
                              padding:"10px 11px",width:"calc(100% - 16px)",textAlign:"left"}}>
                              <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:6,flexWrap:"wrap"}}>
                                <span style={{fontSize:13}}>{evt.icon}</span>
                                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:"#44445a"}}>{fmtD(evt.date)}</span>
                                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"7px",
                                  color:evt.color,background:evt.color+"18",borderRadius:2,padding:"1px 4px",letterSpacing:".06em"}}>
                                  {typeLabel[evt.type]||evt.type}
                                </span>
                              </div>
                              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:11,lineHeight:1.3,marginBottom:evt.reason||evt.flags?.length?5:0}}>
                                {evt.title}
                              </div>
                              {evt.reason && (
                                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",
                                  color:"#e8e8f0",background:"#1a1a22",borderRadius:2,
                                  padding:"4px 7px",marginBottom:evt.flags?.length?4:0,lineHeight:1.5,
                                  borderLeft:`2px solid ${evt.color}`}}>
                                  {evt.reason}
                                </div>
                              )}
                              {evt.subtitle && !evt.reason && (
                                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:"#8888a8",
                                  marginBottom:evt.flags?.length?4:0}}>{evt.subtitle}</div>
                              )}
                              {evt.flags?.length>0 && (
                                <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
                                  {evt.flags.map((f,fi)=>(
                                    <span key={fi} style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"7px",
                                      color:f.col,background:f.col+"15",borderRadius:8,padding:"1px 5px"}}>
                                      {f.icon} {f.txt}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {evt.img && <img src={evt.img} alt="" style={{marginTop:6,width:"100%",maxHeight:70,objectFit:"cover",borderRadius:2}}/>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  </>
                );
              })()}

          </div>
          );
        })()}

      {/* ══ RENPHO MODAL ══ */}
      {showRenphoModal && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>setShowRenphoModal(false)}>
          <div style={{background:"#1a1a22",border:"1px solid #2a2a38",borderRadius:6,padding:20,width:"100%",maxWidth:560,maxHeight:"80vh",display:"flex",flexDirection:"column"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:"#e8e8f0"}}>VISTA PREVIA — IMPORTACIÓN</div>
              <button onClick={()=>setShowRenphoModal(false)} style={{background:"none",border:"none",color:"#8888a8",cursor:"pointer",fontSize:18}}>✕</button>
            </div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#44445a",marginBottom:12}}>
              {renphoPreview.length} mediciones detectadas · Se omitirán duplicados de fechas ya existentes
            </div>
            <div style={{overflowY:"auto",flex:1,marginBottom:12}}>
              <table className="tbl">
                <thead><tr><th>Fecha</th><th>Peso</th><th>Músculo</th><th>% Grasa</th><th>Visceral</th></tr></thead>
                <tbody>
                  {renphoPreview.slice(0,20).map((r,i)=>(
                    <tr key={i}>
                      <td className="mono" style={{color:"#8888a8"}}>{fmtD(r.d)}</td>
                      <td className="mono" style={{color:"#e8e8f0"}}>{r.w} kg</td>
                      <td className="mono" style={{color:"#3ddc84"}}>{r.m ? r.m+" kg" : "—"}</td>
                      <td className="mono" style={{color:"#ffb830"}}>{r.f ? r.f+"%" : "—"}</td>
                      <td className="mono" style={{color:"#4dc8ff"}}>{r.vi ?? "—"}</td>
                    </tr>
                  ))}
                  {renphoPreview.length>20 && <tr><td colSpan={5} className="mono" style={{color:"#44445a",textAlign:"center"}}>... y {renphoPreview.length-20} más</td></tr>}
                </tbody>
              </table>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button className="btn" style={{flex:1,background:"rgba(168,255,62,.12)",color:"#a8ff3e",border:"1px solid rgba(168,255,62,.3)"}} onClick={confirmRenphoImport}>
                ✓ IMPORTAR {renphoPreview.length} MEDICIONES
              </button>
              <button className="btn-sm" onClick={()=>setShowRenphoModal(false)}>CANCELAR</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ IMPORT MODAL ══ */}
      {importJson && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>setImportJson(null)}>
          <div style={{background:"#1a1a22",border:"1px solid #2a2a38",borderRadius:6,padding:20,width:"100%",maxWidth:560,maxHeight:"80vh",display:"flex",flexDirection:"column"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:"#e8e8f0",marginBottom:6}}>RESTAURAR BACKUP</div>
            <div style={{fontSize:10,color:"#44445a",marginBottom:12,lineHeight:1.6}}>Pega el JSON copiado desde el backup o desde la consola del navegador.</div>
            <textarea
              value={importText}
              onChange={e=>setImportText(e.target.value)}
              placeholder='{"log":{...},"favs":[...]}'
              style={{flex:1,minHeight:220,background:"#0c0c0f",border:"1px solid #2a2a38",borderRadius:4,color:"#e8e8f0",fontFamily:"'JetBrains Mono',monospace",fontSize:11,padding:12,resize:"vertical",outline:"none",marginBottom:12}}
            />
            <div style={{display:"flex",gap:8}}>
              <button className="btn" style={{flex:1,background:"rgba(77,200,255,.12)",color:"#4dc8ff",border:"1px solid rgba(77,200,255,.3)"}} onClick={()=>applyImport(importText)}>
                ✓ RESTAURAR
              </button>
              <button className="btn-sm" onClick={()=>setImportJson(null)}>CANCELAR</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ EXPORT MODAL ══ */}
      {exportJson && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>setExportJson(null)}>
          <div style={{background:"#1a1a22",border:"1px solid #2a2a38",borderRadius:6,padding:20,width:"100%",maxWidth:560,maxHeight:"80vh",display:"flex",flexDirection:"column"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#a8ff3e",letterSpacing:".18em"}}>⬇ BACKUP JSON — SELECCIONA TODO Y COPIA</div>
              <button onClick={()=>setExportJson(null)} style={{background:"none",border:"none",color:"#8888a8",cursor:"pointer",fontSize:18,lineHeight:1}}>✕</button>
            </div>
            <p style={{fontSize:11,color:"#44445a",fontFamily:"'JetBrains Mono',monospace",marginBottom:10}}>
              Selecciona todo el texto (Ctrl+A / Cmd+A) → Copia → Pega en un archivo .json
            </p>
            <textarea
              ref={exportTextareaRef}
              readOnly
              value={exportJson}
              onFocus={e=>e.target.select()}
              style={{flex:1,minHeight:300,background:"#0c0c0f",border:"1px solid #2a2a38",borderRadius:3,color:"#3ddc84",fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",padding:12,resize:"none",lineHeight:1.5}}
            />
            <div style={{display:"flex",gap:8,marginTop:12}}>
              <button className="btn" style={{flex:1}} onClick={()=>{
                const ta = exportTextareaRef.current;
                if (ta) { ta.select(); ta.setSelectionRange(0,99999); try { if(document.execCommand('copy')){ alert("✓ Copiado al portapapeles"); return; } }catch(_){} }
                if (navigator.clipboard?.writeText) { navigator.clipboard.writeText(exportJson).then(()=>alert("✓ Copiado")).catch(()=>alert("Usa Ctrl+A → Ctrl+C")); }
                else { alert("Usa Ctrl+A → Ctrl+C para copiar"); }
              }}>
                📋 COPIAR AL PORTAPAPELES
              </button>
              <button className="btn-sm" onClick={()=>setExportJson(null)}>CERRAR</button>
            </div>
          </div>
        </div>
      )}

      </div>
      {/* ── MOBILE BOTTOM NAV ── */}
      <nav className="mobile-bottom-nav" style={{
        position:"fixed",bottom:0,left:0,right:0,zIndex:100,
        background:"#0e0e14",borderTop:"1px solid #2a2a38",
        display:"none", // overridden by CSS on mobile
        alignItems:"stretch",
        paddingBottom:"env(safe-area-inset-bottom,0px)",
      }}>
        {MODULES.map(m=>{
          const isActive = activeModule.id === m.id;
          const ms = m.id==="cuerpo" ? calcMetabolicScore(labResults, allInbody, log, targets) : null;
          const scoreColor = ms ? (ms.score>=80?"#3ddc84":ms.score>=65?"#ffb830":"#ff4d4d") : null;
          return (
            <button key={m.id} onClick={()=>setTab(m.tabs[0][0])} style={{
              flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
              gap:3,padding:"10px 4px 8px",background:"none",border:"none",cursor:"pointer",
              borderTop: isActive ? "2px solid #a8ff3e" : "2px solid transparent",
              transition:"all .15s",minWidth:0,
            }}>
              <span style={{fontSize:18,lineHeight:1}}>{m.icon}</span>
              <span style={{
                fontFamily:"'JetBrains Mono',monospace",fontSize:"7px",letterSpacing:".1em",
                textTransform:"uppercase",color:isActive?"#a8ff3e":"#44445a",
                lineHeight:1,whiteSpace:"nowrap",
              }}>{m.label}</span>
              {/* Badge indicators */}
              {m.id==="nutri" && todayLog.length>0 && (
                <span style={{
                  fontFamily:"'JetBrains Mono',monospace",fontSize:"6px",
                  background:todayKcalPct>=90?"rgba(61,220,132,.2)":todayKcalPct>=60?"rgba(255,184,48,.2)":"rgba(255,77,77,.2)",
                  color:todayKcalPct>=90?"#3ddc84":todayKcalPct>=60?"#ffb830":"#ff4d4d",
                  borderRadius:2,padding:"1px 4px",letterSpacing:".04em",
                }}>{todayMacros.calories}k</span>
              )}
              {m.id==="cuerpo" && ms && (
                <span style={{
                  fontFamily:"'JetBrains Mono',monospace",fontSize:"6px",
                  background:`${scoreColor}22`,color:scoreColor,
                  borderRadius:2,padding:"1px 4px",
                }}>{ms.score}</span>
              )}
              {m.id==="entrena" && (
                <span style={{
                  fontFamily:"'JetBrains Mono',monospace",fontSize:"6px",
                  background:isTrainingDay?"rgba(168,255,62,.1)":"rgba(68,68,90,.15)",
                  color:isTrainingDay?"#a8ff3e":"#44445a",
                  borderRadius:2,padding:"1px 4px",
                }}>{isTrainingDay?"HOY":"DESC"}</span>
              )}
            </button>
          );
        })}
      </nav>

    </div>
    </>
  );
}
const App = dynamic(() => Promise.resolve(AppInner), { ssr: false });
export default App;
