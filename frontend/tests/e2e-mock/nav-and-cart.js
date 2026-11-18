const {chromium}=require("playwright"),crypto=require("crypto");
const S=(process.env.S||"/tmp");
const b64=o=>Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt=(sub)=>{const h=b64({alg:"HS256",typ:"JWT"}),p=b64({sub,role:"authenticated",aud:"authenticated",exp:Math.floor(Date.now()/1000)+3600,iat:Math.floor(Date.now()/1000)});return h+"."+p+"."+crypto.createHmac("sha256","x").update(h+"."+p).digest("base64url")};
const F="aaaaaaaa-0000-0000-0000-00000000000a",B="bbbbbbbb-0000-0000-0000-00000000000b";
const base="http://127.0.0.1:3114";
const cookie=(sub)=>({name:"sb-127-auth-token",value:"base64-"+b64({access_token:jwt(sub),token_type:"bearer",expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,refresh_token:"r",user:{id:sub,aud:"authenticated",role:"authenticated",email:"x@x.test"}}),url:base});
const out=[];const ok=(n,c,extra="")=>{out.push((c?"PASS ":"FAIL ")+n+(extra?" — "+extra:""));};
(async()=>{
 const browser=await chromium.launch();
 async function ctx(sub,mobile){const c=await browser.newContext(mobile?{viewport:{width:390,height:800},deviceScaleFactor:2}:{viewport:{width:1280,height:800}});if(sub)await c.addCookies([cookie(sub)]);return c;}
 const mainLabels=async p=>p.locator('nav[aria-label="Main navigation"] > a, nav[aria-label="Main navigation"] > div > button').allInnerTexts();
 // Farmer, desktop
 let c=await ctx(F),p=await c.newPage();
 await p.goto(base+"/marketplace");await p.waitForSelector("h3");
 const fl=(await p.locator('nav[aria-label="Main navigation"] a').allInnerTexts()).map(s=>s.trim());
 ok("farmer main nav = 5 items",JSON.stringify(fl)===JSON.stringify(["Marketplace","Dashboard","Fields","Knowledge","Subscription"]),JSON.stringify(fl));
 for(const bad of ["Weather","Farm products","Insights","Pricing","Bookkeeping","Profile"])ok("farmer main bar lacks "+bad,!fl.some(x=>x.includes(bad)));
 ok("active page marked (Marketplace aria-current)",await p.locator('nav[aria-label="Main navigation"] a[aria-current="page"]').innerText().then(t=>t.trim()==="Marketplace"));
 await p.getByRole("button",{name:/More/}).click();
 const more=(await p.locator('[role="menu"] a').allInnerTexts()).map(s=>s.trim());
 ok("More menu contents",JSON.stringify(more)===JSON.stringify(["Insights","Pricing guide","Bookkeeping","Profile"]),JSON.stringify(more));
 await p.screenshot({path:S+"/farmer-desktop-more.png"});
 await p.keyboard.press("Escape");ok("More closes on Escape",await p.locator('[role="menu"]').count()===0);
 await p.getByRole("button",{name:/Farmer/}).click();
 ok("Sign out inside account menu",await p.getByRole("menuitem",{name:/Sign out/}).isVisible());
 await p.keyboard.press("Escape");
 // Add to cart on cards
 const cards=p.locator("article");
 const own=cards.filter({hasText:"Fiona Tomatoes"}),other=cards.filter({hasText:"Grace Spinach"});
 ok("farmer: NO Add to cart on OWN listing (element absent)",await own.getByRole("button",{name:/add to cart/i}).count()===0);
 ok("farmer: own listing labelled",await own.getByText("This is your listing").count()===1);
 ok("farmer: Add to cart present on another farmer's listing (per brief)",await other.getByRole("button",{name:/add to cart/i}).count()===1);
 await p.screenshot({path:S+"/farmer-marketplace.png",fullPage:false});
 // detail page of own listing
 await p.goto(base+"/marketplace/11111111-1111-1111-1111-111111111111");
 ok("farmer: own detail page rendered the listing",await p.getByRole("heading",{name:"Fiona Tomatoes"}).count()===1);
 ok("farmer: no Add to cart on own detail page",await p.getByRole("button",{name:/add to cart/i}).count()===0);
 await c.close();
 // Buyer desktop
 c=await ctx(B);p=await c.newPage();
 await p.goto(base+"/marketplace");await p.waitForSelector("h3");
 const bl=(await p.locator('nav[aria-label="Main navigation"] a').allInnerTexts()).map(s=>s.trim());
 ok("buyer main nav (no farmer-only pages)",JSON.stringify(bl)===JSON.stringify(["Marketplace","Dashboard","Knowledge"]),JSON.stringify(bl));
 ok("buyer sees cart shortcut",await p.getByRole("link",{name:"Buyer cart"}).count()===1);
 ok("buyer: Add to cart on BOTH listings incl. Fiona's",await p.getByRole("button",{name:/add to cart/i}).count()===2);
 await p.locator("article").filter({hasText:"Fiona Tomatoes"}).getByRole("button",{name:/add to cart/i}).click();
 await p.goto(base+"/marketplace/11111111-1111-1111-1111-111111111111");
 ok("buyer: Add to cart on detail page",await p.getByRole("button",{name:/add to cart/i}).count()===1);
 // cart persistence + refresh
 await p.getByRole("button",{name:/add to cart/i}).click();
 await p.goto(base+"/cart");await p.waitForSelector("text=Fiona Tomatoes");
 ok("buyer cart shows item",await p.getByText("Fiona Tomatoes").count()>0);
 await p.reload();await p.waitForSelector("text=Fiona Tomatoes");
 ok("cart persists after refresh",await p.getByText("Fiona Tomatoes").count()>0);
 await p.screenshot({path:S+"/buyer-cart.png"});
 await c.close();
 // Stale cart: FARMER holds own listing in cart -> cart page must drop it (role is farmer so cart page is buyer-only; simulate buyer-role user owning listing via mock: buyer B 'owns' listing 2 not modelled) 
 // Signed-out
 c=await ctx(null);p=await c.newPage();
 await p.goto(base+"/marketplace");await p.waitForSelector("h3");
 const vl=(await p.locator('nav[aria-label="Main navigation"] a').allInnerTexts()).map(s=>s.trim());
 ok("visitor nav",JSON.stringify(vl)===JSON.stringify(["Marketplace","Knowledge"]),JSON.stringify(vl));
 ok("visitor: Add to cart shown on both (existing rule)",await p.getByRole("button",{name:/add to cart/i}).count()===2);
 await c.close();
 // Mobile farmer
 c=await ctx(F,true);p=await c.newPage();
 await p.goto(base+"/marketplace");await p.waitForSelector("h3");
 ok("mobile: desktop nav hidden",!(await p.locator('nav[aria-label="Main navigation"]').isVisible()));
 const noOverflow=await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth);
 ok("mobile: no horizontal scroll",noOverflow);
 await p.getByRole("button",{name:"Open menu"}).click();await p.waitForSelector("#mobile-nav");
 await p.waitForTimeout(500);
 const ml=(await p.locator('#mobile-nav a').allInnerTexts()).map(s=>s.trim());
 ok("mobile menu lists 5 main + 4 more",JSON.stringify(ml)===JSON.stringify(["Marketplace","Dashboard","Fields","Knowledge","Subscription","Insights","Pricing guide","Bookkeeping","Profile"]),JSON.stringify(ml));
 ok("mobile menu has Sign out",await p.locator('#mobile-nav').getByRole("button",{name:/Sign out/}).isVisible());
 await p.screenshot({path:S+"/farmer-mobile-menu.png"});
 // navigate each main link
 for(const [name,path] of [["Marketplace","/marketplace"],["Dashboard","/dashboard"],["Fields","/fields"],["Knowledge","/knowledge"],["Subscription","/subscriptions"]]){
  await p.goto(base+"/marketplace");await p.getByRole("button",{name:"Open menu"}).click();await p.locator("#mobile-nav").getByRole("link",{name,exact:true}).click();
  await p.waitForLoadState("networkidle");const st=await p.evaluate(()=>document.title);
  ok("link "+name+" reaches "+path,p.url().includes(path),p.url().replace(base,""));
 }
 await c.close();await browser.close();
 console.log(out.join("\n"));
})().catch(e=>{console.log(out.join("\n"));console.error("SCRIPT ERROR",e.message);process.exit(1)});
