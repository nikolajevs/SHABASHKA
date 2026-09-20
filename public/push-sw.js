self.addEventListener('push',event=>{
  const data=event.data?.json()||{};
  event.waitUntil(self.registration.showNotification(data.title||'Gigs',{body:data.body||'',tag:data.tag||'gigs',data:{url:data.url||'/'},icon:'/favicon.svg'}));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const url=new URL(event.notification.data?.url||'/',self.location.origin);
  if(url.origin!==self.location.origin)return;
  event.waitUntil(self.clients.openWindow(url.href));
});
