const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:8081/index.html');
  await new Promise(r => setTimeout(r, 1000)); // wait for load
  
  // get all read more buttons
  const buttons = await page.$$('.read-more-btn');
  console.log('Total read more buttons found:', buttons.length);
  
  for(let i=0; i<buttons.length; i++) {
     try {
       const box = await buttons[i].boundingBox();
       if (!box) {
         console.log('Button', i, 'is hidden by CSS.');
         continue;
       }
       
       const className = await page.evaluate(el => {
           let card = el.closest('.testimonial-card');
           return card ? card.className : 'null';
       }, buttons[i]);
       
       console.log('Button', i, 'in card:', className);
       
       // Try clicking it using evaluate to avoid exact coordinate issues first
       await page.evaluate(el => el.click(), buttons[i]);
       
       // Check if expanded
       const isExpanded = await page.evaluate(el => {
           let body = el.closest('.testimonial-body');
           return body.classList.contains('expanded');
       }, buttons[i]);
       
       console.log('Button', i, 'expanded via JS click:', isExpanded);
       
     } catch (e) {
       console.log('Error button', i, e.message);
     }
  }
  
  await browser.close();
})();
