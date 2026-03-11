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
  {d:"Ago'18",w:69.3,m:55.1,f:16.4,s:null,vi:4,whr:0.85,note:"Baseline"},
  {d:"Abr'19",w:68.0,m:32.2,f:16.1,s:80,vi:4,whr:0.84,note:""},
  {d:"May'19",w:68.1,m:32.2,f:16.3,s:79,vi:4,whr:0.85,note:""},
  {d:"Jul'19",w:70.9,m:34.5,f:14.4,s:null,vi:4,whr:0.84,note:""},
  {d:"Ago'19",w:70.1,m:33.6,f:15.6,s:82,vi:4,whr:0.83,note:""},
  {d:"Oct'19",w:70.6,m:34.0,f:15.7,s:82,vi:4,whr:0.86,note:""},
  {d:"Nov'19",w:70.2,m:33.4,f:16.3,s:81,vi:4,whr:0.85,note:""},
  {d:"Dic'19",w:70.3,m:32.9,f:17.6,s:79,vi:4,whr:0.86,note:""},
  {d:"Ene'20",w:70.9,m:34.7,f:14.0,s:83,vi:4,whr:0.86,note:"Min grasa ★"},
  {d:"Feb'20",w:71.5,m:34.7,f:14.9,s:82,vi:4,whr:0.87,note:""},
  {d:"Ene'21",w:72.0,m:34.6,f:15.3,s:82,vi:4,whr:0.86,note:""},
  {d:"Abr'21",w:73.5,m:35.4,f:15.6,s:82,vi:4,whr:0.87,note:""},
  {d:"Jul'21",w:74.8,m:36.6,f:14.6,s:85,vi:4,whr:0.90,note:""},
  {d:"Sep'22",w:78.2,m:38.5,f:14.3,s:88,vi:4,whr:0.84,note:"Récord músculo ★"},
  {d:"Ene'25",w:83.4,m:38.5,f:19.3,s:null,vi:7,whr:0.93,note:""},
  {d:"Mar'25",w:83.7,m:39.0,f:18.9,s:null,vi:6,whr:0.94,note:""},
  {d:"May'25",w:82.8,m:38.4,f:19.4,s:null,vi:6,whr:0.94,note:""},
  {d:"Nov'25",w:83.7,m:38.2,f:20.6,s:null,vi:6,whr:0.93,note:"Peor grasa"},
  {d:"Feb'26",w:82.8,m:38.5,f:19.0,s:null,vi:6,whr:0.93,note:"HOY ◀"},
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
`;


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
  const [log, setLog]     = useState(INITIAL_LOG);
  const [favs, setFavs]   = useState(INITIAL_FAVS);
  const [loaded, setLoaded] = useState(false);
  const [selDate, setSelDate] = useState(todayStr());
  const [showAdd, setShowAdd] = useState(false);
  const [addMode, setAddMode] = useState("ai");
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
  const [customInbody, setCustomInbody] = useState([]);
  const [bodyMeasurements, setBodyMeasurements] = useState([]);
  const [labResults, setLabResults] = useState([]);
  // Labs upload
  const [labsLoading, setLabsLoading] = useState(false);
  const [labsResult, setLabsResult]   = useState(null);
  const [labsB64, setLabsB64] = useState(null);
  const [customLabs, setCustomLabs] = useState([]);
  const [userProfile, setUserProfile] = useState(USER_PROFILE_DEFAULT);
  // AI Routine generator
  const [routineInput, setRoutineInput] = useState("");
  const [routineLoading, setRoutineLoading] = useState(false);
  const [generatedRoutine, setGeneratedRoutine] = useState(null);
  const [routineTs, setRoutineTs] = useState(null);
  const [savedRoutines, setSavedRoutines] = useState([]);
  const [aiHabits, setAiHabits] = useState(null);
  const [aiHabitsLoading, setAiHabitsLoading] = useState(false);
  const [aiHabitsTs, setAiHabitsTs] = useState(null);
  // AI week insights
  const [weekInsights, setWeekInsights] = useState(null);
  const [weekInsightsLoading, setWeekInsightsLoading] = useState(false);
  const [weekInsightsTs, setWeekInsightsTs] = useState(null);
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
        // Seed body measurements if empty
        if (dbMeasurements.length === 0) {
          insertBodyMeasurementsBatch(user.id, SEED_INBODY).catch(console.error);
          setBodyMeasurements(SEED_INBODY);
        } else {
          setBodyMeasurements(dbMeasurements);
        }
        // Seed lab results if empty
        if (dbLabs.length === 0) {
          insertLabResultsBatch(user.id, SEED_LABS).catch(console.error);
          setLabResults(SEED_LABS);
        } else {
          setLabResults(dbLabs);
        }
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
        if (profile) {
          const tgt = profile.targets || TARGETS_DEF;
          setTargets(tgt); setTmpTargets(tgt);
          setUserProfile({
            name:             profile.name             || USER_PROFILE_DEFAULT.name,
            goals:            profile.goals            || USER_PROFILE_DEFAULT.goals,
            health_notes:     profile.health_notes     || USER_PROFILE_DEFAULT.health_notes,
            equipment:        profile.equipment        || USER_PROFILE_DEFAULT.equipment,
            supplements:      profile.supplements      || USER_PROFILE_DEFAULT.supplements,
            session_duration: profile.session_duration || USER_PROFILE_DEFAULT.session_duration,
            training_days:    profile.training_days    || USER_PROFILE_DEFAULT.training_days,
          });
        }
        if (Object.keys(logData).length > 0) {
          setLog(logData);
        } else {
          setLog(INITIAL_LOG);
          for (const [date, entries] of Object.entries(INITIAL_LOG)) {
            for (const entry of entries) {
              await upsertFoodEntry(user.id, date, entry).catch(() => {});
            }
          }
        }
        if (favsData.length > 0) setFavs(favsData);
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

  // Auto-analyze day insight when switching to a date that has entries but no insight yet
  useEffect(() => {
    const entries = log[selDate] || [];
    if (entries.length > 0 && !dayInsight[selDate] && tab === "hoy" && loaded) {
      analyzeDayInsight(selDate, entries);
    }
  }, [selDate, tab, loaded]);

  if (authLoading) return null;

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

  const handleImg = e => {
    const f=e.target.files[0]; if(!f) return;
    const r=new FileReader();
    r.onload = ev => { setAiImage(ev.target.result); setAiB64(ev.target.result.split(",")[1]); };
    r.readAsDataURL(f);
  };
  const handleDrop = e => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0]; if(!f||!f.type.startsWith("image/")) return;
    const r = new FileReader();
    r.onload = ev => { setAiImage(ev.target.result); setAiB64(ev.target.result.split(",")[1]); };
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
      whr: inbodyResult.whr, note: inbodyResult.notes || "Nuevo ◀",
    };
    saveCustomInbody([...customInbody, entry], entry);
    setInbodyResult(null); setInbodyB64(null);
    alert("✓ Medición InBody agregada al historial");
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
    setRoutineLoading(true); setGeneratedRoutine(null);
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
    setAiHabitsLoading(true); setAiHabits(null);
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
    setWeekInsightsLoading(true); setWeekInsights(null);
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
  const parseInbodyDate = d => {
    const months={Ene:0,Feb:1,Mar:2,Abr:3,May:4,Jun:5,Jul:6,Ago:7,Sep:8,Oct:9,Nov:10,Dic:11};
    const m=d.match(/([A-Za-z]+)'(\d+)/);
    if(!m) return 0;
    return (2000+parseInt(m[2]))*100+(months[m[1]]??0);
  };
  const allInbody = [...bodyMeasurements, ...customInbody].sort((a,b)=>parseInbodyDate(a.d)-parseInbodyDate(b.d));
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
      if(resolved.customInbody) { saveCustomInbody(resolved.customInbody); restored.push("InBody"); }
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
    {id:"cuerpo", icon:"📊", label:"CUERPO",    tabs:[["cuerpo","INBODY"],["labs","LABS"]]},
    {id:"entrena", icon:"⚡", label:"ENTRENA",  tabs:[["entrena","RUTINA"]]},
    {id:"config", icon:"⚙", label:"CONFIG",    tabs:[["config","CONFIG"]]},
  ];
  const activeModule = MODULES.find(m=>m.tabs.some(([k])=>k===tab)) || MODULES[0];



  const fmtCacheAge = ts => {
    if (!ts) return null;
    const mins = Math.round((Date.now()-ts)/60000);
    if (mins < 60) return `hace ${mins} min`;
    const hrs = Math.round(mins/60);
    return `hace ${hrs}h`;
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
      <div style={{padding:"32px 44px 26px",borderBottom:"1px solid #2a2a38",display:"flex",justifyContent:"space-between",alignItems:"flex-end",gap:16,flexWrap:"wrap",background:"#131318",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:"-80px",right:"-60px",width:"420px",height:"420px",background:"radial-gradient(circle,rgba(168,255,62,.05),transparent 65%)",pointerEvents:"none"}}/>
        <div>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"10px",letterSpacing:".28em",textTransform:"uppercase",color:"#a8ff3e",marginBottom:10}}>{`Dashboard Integral · ${allInbody.length>0 ? allInbody[allInbody.length-1].d : 'Sin datos'}`}</div>
          <div style={{fontFamily:"'Syne',sans-serif",fontSize:"clamp(36px,7vw,72px)",fontWeight:800,lineHeight:.9,letterSpacing:"-.01em"}}>
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
            <div style={{padding:"10px 44px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",userSelect:"none"}}
              onClick={()=>setShowNotifs(v=>!v)}>
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",letterSpacing:".15em",color:"#ffb830"}}>
                🔔 {notifications.length} AVISO{notifications.length>1?"S":""} INTELIGENTE{notifications.length>1?"S":""}
              </span>
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#44445a"}}>{showNotifs?"▲":"▼"}</span>
            </div>
            {showNotifs && (
              <div style={{padding:"0 44px 14px",display:"flex",flexDirection:"column",gap:8}} className="fade-in">
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

      {/* ── MODULE NAV (top) ── */}
      <div style={{display:"flex",borderBottom:"1px solid #2a2a38",background:"#0c0c0f",position:"sticky",top:0,zIndex:50,overflowX:"auto",scrollbarWidth:"none"}}>
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
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:"#a8ff3e",background:"rgba(168,255,62,.08)",borderRadius:2,padding:"1px 5px"}}>82.8 kg</span>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"8px",color:"#ff7a4d",background:"rgba(255,122,77,.08)",borderRadius:2,padding:"1px 5px"}}>19.0%</span>
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
        <div style={{display:"flex",borderBottom:"1px solid #2a2a38",background:"#131318",overflowX:"auto",scrollbarWidth:"none"}}>
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
      <div style={{padding:"24px 44px 80px",maxWidth:1200}}>

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
                  {[["ai","🤖 IA"],["manual","✏ Manual"],["fav","⭐ Favs"]].map(([m,l])=>(
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
                    <div className={`photo-zone${aiImage?" has-img":dragOver?" drag":""}`}
                      onDragOver={e=>{e.preventDefault();setDragOver(true);}}
                      onDragLeave={()=>setDragOver(false)}
                      onDrop={handleDrop}>
                      <input ref={imgRef} type="file" accept="image/*" capture="environment" onChange={handleImg}/>
                      {aiImage
                        ? <img src={aiImage} alt="" style={{width:"100%",maxHeight:220,objectFit:"contain",background:"#0c0c0f",borderRadius:3,display:"block"}}/>
                        : <><div style={{fontSize:28,marginBottom:6}}>📷</div>
                            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"10px",color:"#8888a8",letterSpacing:".1em"}}>SUBIR FOTO DEL PLATO</div>
                            <div style={{fontSize:12,color:"#44445a",marginTop:4}}>click, arrastrá o pegá una imagen</div></>
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
              <table className="tbl">
                <thead><tr><th>Fecha</th><th>Kcal</th><th>Prot</th><th>Carbs</th><th>Grasas</th><th>Comidas</th></tr></thead>
                <tbody>
                  {[...weekData].reverse().map(d=>{
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
            </div>

            {/* ── CHEAT DAY ANALYZER ── */}

          </div>
        )}

        {/* ══ CUERPO ══ */}
        {tab==="cuerpo" && (
          <div>
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
                  <div style={{overflowX:"auto"}}>
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

            <div className="sec-h">Estado Actual — Feb 2026</div>
            <div className="g4" style={{marginBottom:20}}>
              {[
                {l:"Peso",v:"82.8",u:"kg",d:"Peak 83.7 kg (Nov 2025)",sub:"Objetivo: 80 kg",c:"#a8ff3e"},
                {l:"Masa Muscular",v:"38.5",u:"kg",d:"+6.3 kg vs 2019",sub:"Objetivo: ≥39 kg",c:"#3ddc84"},
                {l:"% Grasa",v:"19.0",u:"%",d:"Mejor: 14.0% (Ene 2020)",sub:"Objetivo: 15–16%",c:"#ffb830"},
                {l:"Grasa Visceral",v:"6",u:"lvl",d:"Rango saludable (<10)",sub:"TMB: 1,817 kcal/día",c:"#4dc8ff"},
              ].map(x=>(
                <div key={x.l} className="card" style={{borderTop:`2px solid ${x.c}`}}>
                  <div className="lbl">{x.l}</div>
                  <div className="bnum" style={{color:x.c}}>{x.v}<span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:14,color:"#8888a8",marginLeft:2}}>{x.u}</span></div>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#3ddc84",marginTop:5}}>{x.d}</div>
                  <div style={{fontSize:11,color:"#8888a8",marginTop:3}}>{x.sub}</div>
                </div>
              ))}
            </div>

            <div className="sec-h">Progresión — 2018 a 2026 ({allInbody.length} mediciones)</div>
            <div className="card" style={{padding:"16px 10px",marginBottom:20}}>
              <ResponsiveContainer key={`inbody-chart-${tab}`} width="100%" height={220}>
                <LineChart data={allInbody} margin={{top:5,right:10,bottom:5,left:0}}>
                  <XAxis dataKey="d" tick={{fill:"#44445a",fontSize:8,fontFamily:"JetBrains Mono"}} interval={1}/>
                  <YAxis yAxisId="w" tick={{fill:"#8888a8",fontSize:9}} domain={[65,90]}/>
                  <YAxis yAxisId="f" orientation="right" tick={{fill:"#8888a8",fontSize:9}} domain={[12,24]}/>
                  <Tooltip contentStyle={{background:"#1a1a22",border:"1px solid #2a2a38",borderRadius:4,fontSize:11}}/>
                  <Legend wrapperStyle={{fontSize:10,fontFamily:"JetBrains Mono",color:"#8888a8"}}/>
                  <Line yAxisId="w" type="monotone" dataKey="w" stroke="#a8ff3e" strokeWidth={2} dot={{r:2,fill:"#a8ff3e"}} name="Peso (kg)"/>
                  <Line yAxisId="w" type="monotone" dataKey="m" stroke="#4dc8ff" strokeWidth={2} dot={{r:2,fill:"#4dc8ff"}} name="Músculo (kg)" connectNulls/>
                  <Line yAxisId="f" type="monotone" dataKey="f" stroke="#ff7a4d" strokeWidth={2} dot={{r:2,fill:"#ff7a4d"}} strokeDasharray="5,3" name="% Grasa"/>
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="sec-h">Historial Completo InBody</div>
            <div className="card" style={{overflowX:"auto",marginBottom:20}}>
              <table className="tbl">
                <thead><tr><th>Fecha</th><th>Peso</th><th>Músculo</th><th>% Grasa</th><th>Visceral</th><th>WHR</th><th>Score</th><th>Nota</th></tr></thead>
                <tbody>
                  {[...allInbody].reverse().map(r=>(
                    <tr key={r.d+r.w} style={{background:r.note?.includes("HOY")||r.note?.includes("Nuevo")?"rgba(168,255,62,.04)":""}}>
                      <td className="mono" style={{color:r.note?.includes("HOY")||r.note?.includes("Nuevo")?"#a8ff3e":"#8888a8",fontWeight:r.note?.includes("HOY")||r.note?.includes("Nuevo")?700:400}}>{r.d}</td>
                      <td className="mono">{r.w} kg</td>
                      <td className="mono" style={{color:"#4dc8ff"}}>{r.m ?? "—"} kg</td>
                      <td className="mono" style={{color:r.f<=14.5?"#3ddc84":r.f<=17?"#a8ff3e":r.f<=19?"#ffb830":"#ff4d4d"}}>{r.f}%</td>
                      <td className="mono" style={{color:r.vi<=5?"#3ddc84":"#ffb830"}}>{r.vi}</td>
                      <td className="mono" style={{color:r.whr<=0.90?"#3ddc84":"#ffb830"}}>{r.whr}</td>
                      <td className="mono" style={{color:r.s>=85?"#3ddc84":r.s>=80?"#4dc8ff":"#44445a"}}>{r.s ?? "—"}</td>
                      <td style={{fontSize:10,color:"#8888a8"}}>{r.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Upload new InBody */}
            <div className="sec-h">Análisis Segmental — Feb 2026</div>
            <div className="g2">
              <div className="card" style={{borderTop:"2px solid #4dc8ff"}}>
                <div className="lbl" style={{marginBottom:12}}>Masa Muscular por Segmento</div>
                <table className="tbl">
                  <thead><tr><th>Segmento</th><th>Masa</th><th>% Normal</th><th>Estado</th></tr></thead>
                  <tbody>
                    {[["Brazo Izquierdo","3.94 kg","121.5%","#3ddc84"],["Brazo Derecho","3.93 kg","121.1%","#3ddc84"],["Tronco","29.9 kg","110.6%","#3ddc84"],["Pierna Izquierda","9.71 kg","98.2%","#4dc8ff"],["Pierna Derecha","9.92 kg","100.3%","#4dc8ff"]].map(([s,m,p,c])=>(
                      <tr key={s}><td>{s}</td><td className="mono">{m}</td><td className="mono" style={{color:c}}>{p}</td><td><span style={{background:c==="#3ddc84"?"rgba(61,220,132,.1)":"rgba(77,200,255,.1)",color:c,borderRadius:2,padding:"1px 6px",fontSize:9,fontFamily:"JetBrains Mono,monospace"}}>{c==="#3ddc84"?"Alto":"Normal"}</span></td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="card" style={{borderTop:"2px solid #ff7a4d"}}>
                <div className="lbl" style={{marginBottom:12}}>Grasa por Segmento</div>
                <table className="tbl">
                  <thead><tr><th>Segmento</th><th>Grasa</th><th>Estado</th></tr></thead>
                  <tbody>
                    {[["Brazo Izq.","0.7 kg","normal"],["Brazo Der.","0.7 kg","normal"],["Tronco (abd.)","8.8 kg · 203%","alto"],["Pierna Izq.","2.1 kg","normal"],["Pierna Der.","2.2 kg","normal"]].map(([s,g,e])=>(
                      <tr key={s}><td>{s}</td><td className="mono" style={{color:e==="alto"?"#ffb830":"#8888a8"}}>{g}</td><td><span style={{background:e==="alto"?"rgba(255,184,48,.1)":"rgba(77,200,255,.1)",color:e==="alto"?"#ffb830":"#4dc8ff",borderRadius:2,padding:"1px 6px",fontSize:9,fontFamily:"JetBrains Mono,monospace"}}>{e==="alto"?"Alto ⚠":"Normal"}</span></td></tr>
                    ))}
                  </tbody>
                </table>
                <div style={{marginTop:10,fontSize:11,color:"#ffb830"}}>⚠ Grasa troncal al 203% — foco principal de la definición</div>
              </div>
            </div>

          </div>
        )}

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
                <input ref={labsImgRef} type="file" accept="image/*" onChange={e=>{
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
            <div className="card" style={{padding:"16px 10px",marginBottom:20}}>
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
            <div className="card" style={{overflowX:"auto",marginBottom:20}}>
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

            {/* Hemograma */}
            <div className="sec-h">Hemograma Completo — Serie Roja ⚠ Microcitosis</div>
            <div className="g2" style={{marginBottom:20}}>
              <div className="card" style={{borderTop:"2px solid #4dc8ff"}}>
                <div className="lbl" style={{marginBottom:12}}>Serie Blanca (leucocitos)</div>
                <table className="tbl">
                  <thead><tr><th>Parámetro</th><th>Ago 2025</th><th>Nov 2025</th><th>Ref</th><th>Estado</th></tr></thead>
                  <tbody>
                    {[
                      ["Glóbulos Blancos","4.82","6.62","4.8–10.8","#3ddc84","Normal"],
                      ["Linfocitos %","44.8","45.2","<43.1%","#ffb830","↑ Leve"],
                      ["Neutrófilos %","45.6","44.4","44.3–70%","#3ddc84","Normal"],
                      ["Monocitos %","7.7","7.9","2–9.8%","#3ddc84","Normal"],
                      ["Eosinófilos %","0.08 ↓","1.8","0.5–5%","#3ddc84","Normalizado"],
                      ["Basófilos %","0.21","0.22","0–2%","#3ddc84","Normal"],
                    ].map(([p,a1,a2,ref,c,status])=>(
                      <tr key={p}><td>{p}</td><td className="mono">{a1}</td><td className="mono" style={{color:c}}>{a2}</td><td style={{fontSize:10,color:"#44445a",fontFamily:"'JetBrains Mono',monospace"}}>{ref}</td><td><span style={{background:c==="#3ddc84"?"rgba(61,220,132,.1)":"rgba(255,184,48,.1)",color:c,borderRadius:2,padding:"1px 6px",fontSize:9,fontFamily:"JetBrains Mono,monospace"}}>{status}</span></td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="card" style={{borderTop:"2px solid #ff4d4d"}}>
                <div className="lbl" style={{marginBottom:12}}>Serie Roja — Microcitosis persistente ⚠</div>
                <table className="tbl">
                  <thead><tr><th>Parámetro</th><th>Ago 2025</th><th>Nov 2025</th><th>Ref</th><th>Estado</th></tr></thead>
                  <tbody>
                    {[
                      ["Glóbulos Rojos","5.63","5.96 ↑","4.5–5.9","#ffb830","Lím. Alto"],
                      ["Hemoglobina","13.8 ↓","15.1","13.5–17.9","#3ddc84","Mejoró"],
                      ["Hematocrito","40.8 ↓","45.1","41–53.7%","#3ddc84","Mejoró"],
                      ["VCM ⚠","72.5 ↓↓","75.7 ↓↓","80–98.2 fL","#ff4d4d","Bajo ⚠"],
                      ["HCM ⚠","24.5 ↓↓","25.3 ↓","26–34 pg","#ff4d4d","Bajo ⚠"],
                      ["Plaquetas","248","235","150–450","#3ddc84","Normal"],
                    ].map(([p,a1,a2,ref,c,status])=>(
                      <tr key={p}><td>{p}</td><td className="mono" style={{color:c==="#ff4d4d"?c:"inherit"}}>{a1}</td><td className="mono" style={{color:c}}>{a2}</td><td style={{fontSize:10,color:"#44445a",fontFamily:"'JetBrains Mono',monospace"}}>{ref}</td><td><span style={{background:c==="#3ddc84"?"rgba(61,220,132,.1)":c==="#ffb830"?"rgba(255,184,48,.1)":"rgba(255,77,77,.1)",color:c,borderRadius:2,padding:"1px 6px",fontSize:9,fontFamily:"JetBrains Mono,monospace"}}>{status}</span></td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Other markers */}
            <div className="sec-h">Otros Parámetros</div>
            <div className="g4" style={{marginBottom:20}}>
              {[
                {l:"PSA Prostático · Nov 2025",v:"1.1",u:"ng/mL",ref:"Normal (0–3)",c:"#3ddc84"},
                {l:"Nitrógeno Ureico · Ago 2025",v:"17.8",u:"mg/dL",ref:"Función renal · Ref: 6–24",c:"#3ddc84"},
                {l:"Creatinina · Ago 2025",v:"1.08",u:"mg/dL",ref:"Función renal · Ref: 0.6–1.3",c:"#3ddc84"},
                {l:"GGT (hígado) · Ago 2025",v:"28",u:"U/L",ref:"Función hepática · Ref: 5–55",c:"#3ddc84"},
              ].map(x=>(
                <div key={x.l} className="card" style={{borderTop:`2px solid ${x.c}`}}>
                  <div className="lbl">{x.l}</div>
                  <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:36,color:x.c,lineHeight:1}}>{x.v}<span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:"#8888a8",marginLeft:2}}>{x.u}</span></div>
                  <div style={{marginTop:8}}><span style={{background:"rgba(61,220,132,.1)",color:"#3ddc84",borderRadius:2,padding:"2px 8px",fontSize:9,fontFamily:"'JetBrains Mono',monospace"}}>NORMAL ✓</span></div>
                  <div style={{fontSize:11,color:"#8888a8",marginTop:6}}>{x.ref}</div>
                </div>
              ))}
            </div>
            <div className="g2" style={{marginBottom:20}}>
              {[
                {l:"Ácido Úrico · Ago 2025",v:"5.71",u:"mg/dL",ref:"Sin riesgo de gota · Ref: 4–7",c:"#3ddc84"},
                {l:"Ácido Úrico (calculado)",v:"—",u:"",ref:"Siguiente panel: solicitar con hemograma",c:"#44445a"},
              ].map(x=>(
                <div key={x.l} className="card" style={{borderTop:`2px solid ${x.c}`}}>
                  <div className="lbl">{x.l}</div>
                  <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:36,color:x.c,lineHeight:1}}>{x.v}<span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:"#8888a8",marginLeft:2}}>{x.u}</span></div>
                  <div style={{fontSize:11,color:"#8888a8",marginTop:8}}>{x.ref}</div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* ══ ENTRENA ══ */}
        {tab==="entrena" && (
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
                rows={4} className="inp" style={{resize:"vertical",marginBottom:10}}/>
              <div style={{display:"flex",gap:8,marginBottom:generatedRoutine?14:0}}>
                <button className="btn" style={{flex:1}} onClick={generateRoutine} disabled={routineLoading||!routineInput.trim()}>
                  {routineLoading?<span>GENERANDO <span className="dots"><span/><span/><span/></span></span>:"⚡ GENERAR RUTINA CON IA"}
                </button>
                {routineTs && <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#44445a",alignSelf:"center",whiteSpace:"nowrap"}}>{fmtCacheAge(routineTs)}</span>}
              </div>
              {generatedRoutine?.error && <div style={{fontFamily:"'JetBrains Mono',monospace",color:"#ff4d4d",fontSize:11}}>{generatedRoutine.error}</div>}
              {generatedRoutine && !generatedRoutine.error && (
                <div className="fade-in">
                  <div style={{marginBottom:12}}>
                    <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:22,marginBottom:4}}>{generatedRoutine.title}</div>
                    {generatedRoutine.description && <p style={{fontSize:12,color:"#8888a8",lineHeight:1.5}}>{generatedRoutine.description}</p>}
                  </div>
                  {generatedRoutine.days?.map((day,i)=>(
                    <div key={i} className="card" style={{marginBottom:10,borderTop:`2px solid ${day.type?.includes("DESCANSO")||day.type?.includes("REST")?"#2a2a38":"#a8ff3e"}`,opacity:day.type?.includes("DESCANSO")||day.type?.includes("REST")?0.5:1}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                        <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:18}}>{day.day}</div>
                        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#a8ff3e",letterSpacing:".15em",textTransform:"uppercase"}}>{day.type}</div>
                      </div>
                      {day.exercises?.map((ex,j)=>(
                        <div key={j} style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"6px 0",borderBottom:"1px solid rgba(42,42,56,.4)"}}>
                          <div style={{flex:1}}>
                            <div style={{fontSize:13,fontFamily:"'Instrument Sans',sans-serif",fontWeight:500}}>{ex.name}</div>
                            {ex.notes && <div style={{fontSize:11,color:"#3ddc84",marginTop:2}}>💡 {ex.notes}</div>}
                          </div>
                          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"10px",color:"#a8ff3e",flexShrink:0,marginLeft:10}}>{ex.sets}</div>
                        </div>
                      ))}
                    </div>
                  ))}
                  {generatedRoutine.notes && (
                    <div className="ins ib">
                      <strong>📝 Notas importantes</strong>
                      {generatedRoutine.notes}
                    </div>
                  )}
                </div>
              )}
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
        )}

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

          return (
          <div>
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

            {/* ── Plan de Referencia ── */}
            <div className="sec-h">Plan de Referencia — {isTrainingDay?"Día de Entreno":"Día de Descanso"}</div>
            <p style={{fontSize:12,color:"#44445a",marginBottom:14,fontFamily:"'JetBrains Mono',monospace",letterSpacing:".06em"}}>
              PLANTILLA BASE CLÍNICA · REFERENCIA DE MACROS Y ALIMENTOS
            </p>
            {PLAN_MEALS.map(m=>(
              <div key={m.name} className="card" style={{marginBottom:12,borderLeft:`3px solid ${m.highlight?"#a8ff3e":"#2a2a38"}`,borderRadius:"0 4px 4px 0"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10,flexWrap:"wrap",gap:8}}>
                  <div>
                    <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:18}}>{m.name}</div>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#8888a8"}}>{m.time}</div>
                  </div>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"10px",color:"#8888a8",textAlign:"right"}}>
                    <span style={{color:"#ffb830"}}>{m.kcal} kcal</span> · P:{m.p}g · C:{m.c}g · G:{m.f}g
                  </div>
                </div>
                {m.items.map(it=>(
                  <div key={it.n} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid rgba(42,42,56,.4)",gap:10}}>
                    <div style={{fontSize:13,fontWeight:500}}>{it.n}</div>
                    <div style={{fontSize:11,color:"#3ddc84",textAlign:"right",flex:"0 0 50%",fontStyle:"italic"}}>✦ {it.why}</div>
                  </div>
                ))}
              </div>
            ))}

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

            {/* ── Próximos pasos clínicos ── */}
            <div className="sec-h">Próximos Pasos Clínicos</div>
            <div className="card">
              {[
                lastInbody?.vi>=10 && {icon:"🚶",text:`Grasa visceral ${lastInbody?.vi} (meta <10) — caminar 15–20 min post-almuerzo todos los días es el mayor driver para reducirla`},
                lastInbody && lastInbody.m<38.5 && {icon:"💪",text:`Masa muscular ${lastInbody?.m}kg (meta ≥38.5kg) — priorizar proteína post-entreno y consistencia en entrenos de fuerza`},
                avgProtein14>0 && avgProtein14<targets.protein*0.85 && {icon:"🥩",text:`Déficit de proteína crónico (promedio ${avgProtein14}g vs meta ${targets.protein}g) — agrega fuente proteica en cada comida`},
                {icon:"📅",text:"Repetir HbA1c en Mayo 2026. Si ≥6.0%, manejo médico inmediato"},
                {icon:"🔬",text:"Pedir ferritina + hierro sérico + TIBC en próximo panel (microcitosis VCM 72–75)"},
                {icon:"📊",text:"Check InBody cada 6–8 semanas para medir progreso de recomposición"},
                {icon:"💊",text:"Evaluar con médico ajuste de rosuvastatina si LDL no baja de 100 mg/dL"},
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
                <div className="sec-h">Hábitos Base — Protocolo 2026</div>
            <p style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"10px",color:"#44445a",marginBottom:16,lineHeight:1.5,letterSpacing:".04em"}}>Protocolo de hábitos personalizado generado por IA según tu progreso actual.</p>
                {HABITS.map((h,i)=>(
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

            {/* Static section — always visible */}
            <div className="sec-h">Alertas Clínicas — Baseline</div>
            {INSIGHTS.filter(i=>i.lvl!=="g").map(i=>(
              <div key={i.title} className={`ins i${i.lvl}`}>
                <strong>{i.icon} {i.title}</strong>
                {i.txt}
              </div>
            ))}
            <div className="sec-h">Resultados Positivos</div>
            {INSIGHTS.filter(i=>i.lvl==="g").map(i=>(
              <div key={i.title} className="ins ig">
                <strong>{i.icon} {i.title}</strong>
                {i.txt}
              </div>
            ))}
          </div>
        )}

        {/* ══ CONFIG ══ */}
        {tab==="config" && (
          <div>
            <div className="sec-h">Perfil de Usuario</div>
            <p style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"10px",color:"#44445a",marginBottom:16,lineHeight:1.5,letterSpacing:".04em"}}>Este perfil alimenta todos los análisis y rutinas con IA. Mantenlo actualizado.</p>
            <div className="card" style={{marginBottom:14}}>
              <ProfileEditor userProfile={userProfile} onSave={saveUserProfile}/>
            </div>

                        <div className="sec-h">Objetivos Nutricionales</div>
            <p style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"10px",color:"#44445a",marginBottom:16,lineHeight:1.5,letterSpacing:".04em"}}>Ajusta tus objetivos de macros, gestiona favoritos y haz backup de tu data.</p>
            <div className="card" style={{marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <span style={{fontFamily:"'Syne',sans-serif",fontSize:15,fontWeight:700}}>Macros diarios</span>
                <button className="btn-sm" onClick={()=>{ setEditTargets(!editTargets); setTmpTargets(targets); }}>
                  {editTargets?"CANCELAR":"EDITAR"}
                </button>
              </div>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"9px",color:"#44445a",marginBottom:12,letterSpacing:".08em"}}>
                {`Calculados para ${userProfile.goals.slice(0,30)}... · ${allInbody[allInbody.length-1]?.w||"—"} kg · TMB ${allInbody[allInbody.length-1] ? Math.round(370+21.6*allInbody[allInbody.length-1].m).toLocaleString() : "—"} kcal`}
              </div>
              {MACRO_KEYS.map(k=>(
                <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <span style={{fontSize:13,color:"#8888a8"}}>{MACRO_CFG[k].label}</span>
                  {editTargets
                    ? <input type="number" value={tmpTargets[k]} onChange={e=>setTmpTargets({...tmpTargets,[k]:Number(e.target.value)})} className="inp" style={{width:90,padding:"5px 8px",fontSize:13}}/>
                    : <span style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:26,color:MACRO_CFG[k].color}}>{targets[k]} <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:"#8888a8"}}>{MACRO_CFG[k].unit}</span></span>
                  }
                </div>
              ))}
              {editTargets && (
                <button className="btn" style={{width:"100%"}} onClick={()=>{ saveTargets(tmpTargets); setEditTargets(false); }}>
                  ✓ GUARDAR OBJETIVOS
                </button>
              )}
            </div>
            <div className="sec-h">Alimentos Favoritos</div>
            <div className="card" style={{marginBottom:14}}>
              <button className="btn-sm" style={{width:"100%",marginBottom:12}} onClick={()=>setShowFavForm(!showFavForm)}>
                {showFavForm?"✕ CANCELAR":"+ NUEVO FAVORITO"}
              </button>
              {showFavForm && (
                <div style={{marginBottom:12,padding:"12px",background:"#1a1a22",borderRadius:3}}>
                  <input placeholder="Nombre del alimento" value={favForm.name}
                    onChange={e=>setFavForm({...favForm,name:e.target.value})} className="inp" style={{marginBottom:8}}/>
                  <div className="g2" style={{gap:8}}>
                    {MACRO_KEYS.map(k=>(
                      <input key={k} placeholder={`${MACRO_CFG[k].label} (${MACRO_CFG[k].unit})`}
                        type="number" value={favForm[k]||""} onChange={e=>setFavForm({...favForm,[k]:e.target.value})}
                        className="inp"/>
                    ))}
                  </div>
                  <button className="btn" style={{width:"100%",marginTop:10}} onClick={()=>{
                    if(favForm.name) {
                      const nf2={...favForm,id:Date.now(),calories:Number(favForm.calories),protein:Number(favForm.protein),carbs:Number(favForm.carbs),fats:Number(favForm.fats)}; saveFavs([...favs,nf2],nf2.id);
                      setFavForm({name:"",calories:0,protein:0,carbs:0,fats:0}); setShowFavForm(false);
                    }
                  }}>✓ GUARDAR</button>
                </div>
              )}
              {favs.length===0
                ? <p style={{fontFamily:"'JetBrains Mono',monospace",color:"#44445a",fontSize:10,textAlign:"center",padding:"12px 0",letterSpacing:".1em"}}>SIN FAVORITOS AÚN</p>
                : favs.map(f=>(
                    <div key={f.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:"1px solid rgba(42,42,56,.4)"}}>
                      <div>
                        <div style={{fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:13}}>{f.name}</div>
                        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"10px",color:"#8888a8"}}>{f.calories}kcal · {f.protein}g P · {f.carbs}g C · {f.fats}g F</div>
                      </div>
                      <button onClick={()=>{deleteFavorite(f.id).catch(()=>{}); saveFavs(favs.filter(x=>x.id!==f.id));}} style={{background:"none",border:"none",color:"#44445a",cursor:"pointer",fontSize:14}}>🗑</button>
                    </div>
                  ))
              }
            </div>
            <div className="sec-h">Backup & Restaurar</div>
            <div className="card">
              <p style={{fontSize:12,color:"#8888a8",marginBottom:14,lineHeight:1.6}}>
                Exporta un backup JSON con todo tu log de comidas, favoritos, objetivos, InBody y labs personalizados. Importa para restaurar entre sesiones.
              </p>
              <button className="btn" style={{width:"100%",marginBottom:8,background:"rgba(61,220,132,.08)",color:"#3ddc84",border:"1px solid rgba(61,220,132,.3)"}} onClick={exportData}>
                ⬇ EXPORTAR BACKUP COMPLETO (.JSON)
              </button>
              <button className="btn" style={{width:"100%",marginBottom:8,background:"rgba(77,200,255,.08)",color:"#4dc8ff",border:"1px solid rgba(77,200,255,.3)"}} onClick={()=>{setImportText("");setImportJson(true);}}>
                ⬆ RESTAURAR — PEGAR JSON
              </button>
              <button className="btn" style={{width:"100%",background:"rgba(77,200,255,.04)",color:"#44445a",border:"1px solid #1e1e2a",fontSize:10}} onClick={()=>backupRef.current.click()}>
                ⬆ RESTAURAR — SUBIR ARCHIVO
              </button>
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
    </div>
    </>
  );
}
const App = dynamic(() => Promise.resolve(AppInner), { ssr: false });
export default App;
