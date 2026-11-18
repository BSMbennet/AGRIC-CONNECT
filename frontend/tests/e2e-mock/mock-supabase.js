const http=require("http"),crypto=require("crypto");
const F="aaaaaaaa-0000-0000-0000-00000000000a",B="bbbbbbbb-0000-0000-0000-00000000000b",G="cccccccc-0000-0000-0000-00000000000c";
const b64=o=>Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt=(sub)=>{const h=b64({alg:"HS256",typ:"JWT"}),p=b64({sub,role:"authenticated",aud:"authenticated",exp:Math.floor(Date.now()/1000)+3600,iat:Math.floor(Date.now()/1000)});return h+"."+p+"."+crypto.createHmac("sha256","x").update(h+"."+p).digest("base64url")};
const users={[F]:{id:F,email:"f@x.test",role:"farmer",name:"Farmer Fiona"},[B]:{id:B,email:"b@x.test",role:"buyer",name:"Buyer Bongani"}};
const mk=(id,name,farmer)=>({id,produce_name:name,category:"Vegetables",quantity_available:100,reserved_quantity:0,quantity_sold:0,is_organic:true,unit:"kg",asking_price:12.5,currency:"ZAR",price_unit:"kg",locality:"Thohoyandou",municipality:"Thulamela",district:"Vhembe",available_from:"2026-11-01",harvest_date:null,quality_notes:"Fresh",created_at:"2026-11-10T00:00:00Z",expires_at:null,image_urls:[],status:"active",farmer_id:farmer});
const listings=[mk("11111111-1111-1111-1111-111111111111","Fiona Tomatoes",F),mk("22222222-2222-2222-2222-222222222222","Grace Spinach",G)];
const log=[];
http.createServer((req,res)=>{
 const u=new URL(req.url,"http://x"),tok=(req.headers.authorization||"").replace("Bearer ","");
 let sub=null;try{sub=JSON.parse(Buffer.from(tok.split(".")[1],"base64url")).sub}catch{}
 const send=(c,b)=>{res.writeHead(c,{"content-type":"application/json","content-range":"0-0/*"});res.end(JSON.stringify(b))};
 log.push(req.method+" "+u.pathname+u.search.slice(0,90));
 if(u.pathname==="/__log")return send(200,log);
 if(u.pathname.startsWith("/auth/v1/user"))return users[sub]?send(200,{id:sub,aud:"authenticated",role:"authenticated",email:users[sub].email,app_metadata:{},user_metadata:{},created_at:"2026-01-01T00:00:00Z"}):send(401,{message:"bad jwt"});
 if(u.pathname.includes("jwks"))return send(200,{keys:[]});
 const obj=(req.headers.accept||"").includes("vnd.pgrst.object");
 if(u.pathname==="/rest/v1/profiles"){const x=users[sub];const row=x?{id:sub,role:x.role,display_name:x.name,phone_e164:null,locality:"Thohoyandou",district:"Vhembe"}:null;return obj?(row?send(200,row):send(406,{message:"none"})):send(200,row?[row]:[])}
 if(u.pathname==="/rest/v1/produce_listings"){let r=listings;const fe=u.searchParams.get("farmer_id");if(fe&&fe.startsWith("eq."))r=r.filter(l=>l.farmer_id===fe.slice(3));if(u.searchParams.get("farmer_id")&&u.searchParams.get("farmer_id").startsWith("neq."))r=r.filter(l=>l.farmer_id!==u.searchParams.get("farmer_id").slice(4));const idf=u.searchParams.get("id");if(idf&&idf.startsWith("eq."))r=r.filter(l=>l.id===idf.slice(3));return obj?(r[0]?send(200,r[0]):send(406,{message:"none"})):send(200,r)}
 send(200,[]);
}).listen(54321,"127.0.0.1");
