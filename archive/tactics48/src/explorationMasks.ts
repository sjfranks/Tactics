export type MaskPoint={x:number;y:number};
export type MaskKind='collision'|'foreground';
export type MaskZone={id:string;name:string;kind:MaskKind;points:MaskPoint[];source?:string;depthY?:number};

export const MAP_WIDTH=1536;
export const MAP_HEIGHT=1024;
export const MASK_STORAGE_KEY='tactics48.avaran.masks.v1';
export const FOREGROUND_SOURCES=[
  {id:'ground',name:'Painted ground'},
  {id:'sarano-house',name:'House Sarano'},
  {id:'sun-inn',name:'Sun Inn'},
  {id:'arena-gate',name:'Arena gate'},
  {id:'old-olive',name:'Olive tree'},
  {id:'cypress-wall',name:'Cypress wall'},
  {id:'varite-shrine',name:'Old spring'}
];

// These polygons are world-space coordinates, traced against the painted 1536 × 1024 ground.
// The bridge is deliberately left open between the two river polygons.
export const DEFAULT_MASKS:MaskZone[]=[
  {id:'river-north',name:'River · north bank',kind:'collision',points:[{x:1330,y:0},{x:1536,y:0},{x:1536,y:434},{x:1267,y:434},{x:1280,y:413},{x:1302,y:389},{x:1320,y:357},{x:1350,y:318},{x:1381,y:274},{x:1390,y:240},{x:1379,y:203},{x:1343,y:170},{x:1322,y:131},{x:1315,y:90},{x:1337,y:52}]},
  {id:'river-south',name:'River · south bank',kind:'collision',points:[{x:1261,y:498},{x:1536,y:500},{x:1536,y:1024},{x:1045,y:1024},{x:1084,y:994},{x:1111,y:955},{x:1137,y:916},{x:1172,y:884},{x:1188,y:836},{x:1213,y:794},{x:1232,y:752},{x:1259,y:718},{x:1280,y:678},{x:1306,y:631},{x:1310,y:600},{x:1286,y:563},{x:1254,y:540}]},
  {id:'northwest-cliff',name:'North-west escarpment',kind:'collision',points:[{x:0,y:0},{x:398,y:0},{x:376,y:26},{x:350,y:33},{x:329,y:70},{x:296,y:83},{x:236,y:101},{x:217,y:133},{x:170,y:158},{x:153,y:187},{x:116,y:192},{x:97,y:226},{x:40,y:226},{x:0,y:211}]},
  {id:'western-cliff',name:'Western rocks',kind:'collision',points:[{x:0,y:326},{x:60,y:348},{x:100,y:371},{x:115,y:414},{x:91,y:449},{x:57,y:458},{x:0,y:477}]},
  {id:'southwest-cliff',name:'South-west bluff',kind:'collision',points:[{x:0,y:869},{x:45,y:891},{x:97,y:918},{x:118,y:946},{x:167,y:972},{x:188,y:1024},{x:0,y:1024}]},
  {id:'southwest-ledge',name:'Old spring rock ledge',kind:'collision',points:[{x:266,y:904},{x:313,y:894},{x:365,y:881},{x:412,y:899},{x:454,y:927},{x:520,y:941},{x:533,y:979},{x:469,y:997},{x:419,y:980},{x:384,y:964},{x:327,y:970},{x:270,y:954}]},
  {id:'east-market-cliff',name:'East market rock face',kind:'collision',points:[{x:1110,y:550},{x:1162,y:535},{x:1202,y:546},{x:1234,y:568},{x:1253,y:624},{x:1229,y:675},{x:1185,y:698},{x:1140,y:682},{x:1098,y:649},{x:1073,y:598}]},
  {id:'southern-crags',name:'South-eastern crags',kind:'collision',points:[{x:1009,y:834},{x:1040,y:802},{x:1087,y:787},{x:1128,y:802},{x:1158,y:837},{x:1154,y:878},{x:1113,y:915},{x:1072,y:923},{x:1029,y:891}]},
  {id:'arena-back-wall',name:'Arena back wall',kind:'collision',points:[{x:819,y:0},{x:1176,y:0},{x:1205,y:49},{x:1206,y:132},{x:1175,y:170},{x:1140,y:137},{x:1146,y:93},{x:1111,y:65},{x:1040,y:48},{x:957,y:52},{x:901,y:71},{x:859,y:107},{x:840,y:161},{x:817,y:160},{x:811,y:99}]},
  {id:'arena-left-rim',name:'Arena west parapet',kind:'collision',points:[{x:818,y:110},{x:839,y:129},{x:856,y:189},{x:902,y:216},{x:926,y:246},{x:867,y:240},{x:831,y:214},{x:811,y:172}]},
  {id:'arena-right-rim',name:'Arena east parapet',kind:'collision',points:[{x:1172,y:102},{x:1206,y:134},{x:1207,y:193},{x:1183,y:231},{x:1110,y:258},{x:1073,y:241},{x:1138,y:214},{x:1167,y:185}]},
  {id:'plaza-planter',name:'Market planter',kind:'collision',points:[{x:836,y:493},{x:845,y:467},{x:881,y:456},{x:934,y:463},{x:977,y:481},{x:979,y:512},{x:947,y:544},{x:891,y:551},{x:847,y:533}]},
  {id:'sarano-house-footprint',name:'House Sarano footprint',kind:'collision',points:[{x:132,y:226},{x:189,y:209},{x:341,y:208},{x:422,y:237},{x:433,y:335},{x:391,y:360},{x:174,y:350},{x:121,y:317}]},
  {id:'sun-inn-footprint',name:'Sun Inn footprint',kind:'collision',points:[{x:488,y:214},{x:551,y:193},{x:677,y:190},{x:757,y:223},{x:764,y:307},{x:707,y:339},{x:515,y:330},{x:477,y:288}]},
  {id:'arena-gate-footprint',name:'Arena gate footprint',kind:'collision',points:[{x:816,y:206},{x:862,y:188},{x:1050,y:187},{x:1118,y:205},{x:1126,y:278},{x:1083,y:290},{x:841,y:286}]},
  {id:'olive-trunk',name:'Olive tree trunk',kind:'collision',points:[{x:325,y:786},{x:350,y:773},{x:378,y:786},{x:393,y:820},{x:372,y:844},{x:331,y:842},{x:313,y:820}]},
  {id:'cypress-stonework',name:'Cypress stonework',kind:'collision',points:[{x:595,y:745},{x:643,y:733},{x:781,y:738},{x:825,y:763},{x:816,y:797},{x:613,y:793}]},
  {id:'old-spring-base',name:'Old spring base',kind:'collision',points:[{x:210,y:678},{x:240,y:658},{x:303,y:662},{x:343,y:685},{x:347,y:728},{x:304,y:746},{x:219,y:731}]},
  {id:'north-road-wall',name:'North road wall',kind:'collision',points:[{x:209,y:30},{x:248,y:31},{x:288,y:54},{x:339,y:66},{x:378,y:64},{x:374,y:95},{x:317,y:105},{x:254,y:82},{x:218,y:67}]},
  {id:'western-road-wall',name:'West road wall',kind:'collision',points:[{x:0,y:263},{x:72,y:270},{x:154,y:298},{x:255,y:307},{x:300,y:294},{x:333,y:287},{x:344,y:305},{x:303,y:329},{x:250,y:334},{x:143,y:322},{x:45,y:295},{x:0,y:297}]},
  {id:'plaza-south-wall',name:'Plaza south wall',kind:'collision',points:[{x:648,y:558},{x:695,y:570},{x:761,y:566},{x:810,y:555},{x:808,y:577},{x:763,y:592},{x:693,y:593},{x:650,y:578}]},
  {id:'bridge-north-parapet',name:'Bridge north parapet',kind:'collision',points:[{x:1245,y:431},{x:1281,y:424},{x:1423,y:427},{x:1465,y:442},{x:1452,y:451},{x:1409,y:440},{x:1282,y:438},{x:1254,y:448}]},
  {id:'bridge-south-parapet',name:'Bridge south parapet',kind:'collision',points:[{x:1246,y:479},{x:1286,y:482},{x:1407,y:487},{x:1462,y:509},{x:1454,y:521},{x:1392,y:503},{x:1294,y:499},{x:1252,y:492}]},

  // Foreground masks clip the *painted* image, so characters disappear behind
  // the exact rocks and parapets instead of turning translucent.
  {id:'arena-front-foreground',name:'Arena front parapet',kind:'foreground',source:'ground',depthY:274,points:[{x:829,y:169},{x:855,y:183},{x:887,y:211},{x:931,y:228},{x:959,y:234},{x:1018,y:242},{x:1066,y:230},{x:1113,y:217},{x:1174,y:178},{x:1190,y:197},{x:1145,y:231},{x:1084,y:253},{x:1039,y:262},{x:961,y:258},{x:914,y:244},{x:861,y:223},{x:828,y:197}]},
  {id:'west-wall-foreground',name:'West road wall',kind:'foreground',source:'ground',depthY:349,points:[{x:0,y:258},{x:74,y:267},{x:161,y:299},{x:248,y:303},{x:294,y:285},{x:337,y:287},{x:346,y:308},{x:292,y:332},{x:250,y:336},{x:145,y:321},{x:50,y:296},{x:0,y:294}]},
  {id:'plaza-wall-foreground',name:'Plaza south wall',kind:'foreground',source:'ground',depthY:610,points:[{x:642,y:551},{x:693,y:568},{x:751,y:566},{x:808,y:551},{x:815,y:575},{x:763,y:593},{x:689,y:595},{x:645,y:577}]},
  {id:'bridge-front-foreground',name:'Bridge front parapet',kind:'foreground',source:'ground',depthY:526,points:[{x:1240,y:467},{x:1276,y:475},{x:1328,y:477},{x:1401,y:485},{x:1463,y:506},{x:1470,y:524},{x:1395,y:505},{x:1323,y:499},{x:1271,y:493},{x:1242,y:488}]},
  {id:'old-spring-foreground',name:'Old spring stair wall',kind:'foreground',source:'ground',depthY:857,points:[{x:96,y:747},{x:136,y:772},{x:199,y:796},{x:281,y:811},{x:328,y:797},{x:338,y:817},{x:288,y:836},{x:198,y:833},{x:119,y:806},{x:88,y:785}]},
  {id:'east-cliff-foreground',name:'East market cliff face',kind:'foreground',source:'ground',depthY:705,points:[{x:1081,y:544},{x:1122,y:531},{x:1188,y:538},{x:1235,y:568},{x:1260,y:616},{x:1242,y:668},{x:1200,y:704},{x:1151,y:686},{x:1192,y:646},{x:1206,y:605},{x:1174,y:572},{x:1112,y:561},{x:1084,y:577}]}
];

export function cloneMasks(masks:MaskZone[]):MaskZone[]{return masks.map(mask=>({...mask,points:mask.points.map(point=>({...point}))}));}

export function validateMasks(value:unknown):MaskZone[]|undefined{
  const list=Array.isArray(value)?value:(value&&typeof value==='object'&&'masks' in value?(value as {masks:unknown}).masks:undefined);
  if(!Array.isArray(list)||list.length>150)return undefined;
  const ids=new Set<string>();
  const masks:MaskZone[]=[];
  for(const item of list){
    if(!item||typeof item!=='object')return undefined;
    const zone=item as Partial<MaskZone>;
    if(typeof zone.id!=='string'||zone.id.length>80||ids.has(zone.id)||typeof zone.name!=='string'||zone.name.length>100||!['collision','foreground'].includes(zone.kind??'')||!Array.isArray(zone.points)||zone.points.length<3||zone.points.length>100)return undefined;
    if(zone.source!==undefined&&!FOREGROUND_SOURCES.some(source=>source.id===zone.source))return undefined;
    if(zone.depthY!==undefined&&(!Number.isFinite(zone.depthY)||zone.depthY<0||zone.depthY>MAP_HEIGHT))return undefined;
    const points:MaskPoint[]=[];
    for(const point of zone.points){if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y)||point.x<0||point.x>MAP_WIDTH||point.y<0||point.y>MAP_HEIGHT)return undefined;points.push({x:point.x,y:point.y});}
    ids.add(zone.id);masks.push({id:zone.id,name:zone.name,kind:zone.kind!,points,source:zone.source??'ground',depthY:zone.depthY});
  }
  return masks;
}

export function loadMasks(){
  try{const stored=localStorage.getItem(MASK_STORAGE_KEY);if(stored){const loaded=validateMasks(JSON.parse(stored));if(loaded)return loaded;}}catch{}
  return cloneMasks(DEFAULT_MASKS);
}

export function saveMasks(masks:MaskZone[]){
  const valid=validateMasks(masks);if(!valid)throw new Error('Invalid mask geometry.');
  localStorage.setItem(MASK_STORAGE_KEY,JSON.stringify({version:1,masks:valid}));
  return valid;
}

export function pointInside(point:MaskPoint,polygon:MaskPoint[]){
  let inside=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const a=polygon[i],b=polygon[j];
    if((a.y>point.y)!==(b.y>point.y)&&point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x)inside=!inside;
  }
  return inside;
}

export function segmentDistance(point:MaskPoint,a:MaskPoint,b:MaskPoint){
  const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.y-a.y)*dy)/(dx*dx+dy*dy||1)));
  return Math.hypot(point.x-(a.x+dx*t),point.y-(a.y+dy*t));
}

export function circleTouchesPolygon(point:MaskPoint,radius:number,polygon:MaskPoint[]){
  if(pointInside(point,polygon))return true;
  return polygon.some((vertex,index)=>segmentDistance(point,vertex,polygon[(index+1)%polygon.length])<radius);
}

export function polygonBounds(polygon:MaskPoint[]){
  return{x0:Math.min(...polygon.map(point=>point.x)),y0:Math.min(...polygon.map(point=>point.y)),x1:Math.max(...polygon.map(point=>point.x)),y1:Math.max(...polygon.map(point=>point.y))};
}
