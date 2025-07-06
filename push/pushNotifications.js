// Initialize OneSignal
window.OneSignalDeferred = window.OneSignalDeferred || [];
OneSignalDeferred.push(async function (OneSignal) {
  try {
    await OneSignal.init({
      appId: "65e53671-840a-40bd-a24b-6db4b0e8d555",
      allowLocalhostAsSecureOrigin: true
    });
    console.log('OneSignal inicializado com sucesso.');
    OneSignal.User.PushSubscription.addEventListener('change', async (event) => {
      if (event.current.optedIn && window.currentUserPlayer?.id) {
        await OneSignal.login(window.currentUserPlayer.id);
        console.log(`External User ID configurado: ${window.currentUserPlayer.id}`);
        await OneSignal.User.addAliases({
          firebase_id: window.currentUserPlayer.id,
          crm_user_id: `crm_${window.currentUserPlayer.id}`
        });
        console.log('Aliases adicionados com sucesso:', {
          firebase_id: window.currentUserPlayer.id,
          crm_user_id: `crm_${window.currentUserPlayer.id}`
        });
      }
    });
  } catch (error) {
    console.error('Erro ao configurar OneSignal:', error);
  }
});

// Function to send push notifications
async function sendPushNotification(message, imageUrl = null) {
  try {
    const payload = {
      app_id: "65e53671-840a-40bd-a24b-6db4b0e8d555",
      headings: { en: "🏐 Vôlei BNH - Atualização" },
      contents: { en: message },
      included_segments: ["All"],
      url: "https://smv-eletronica.github.io/volei-bnh/lista.html"
    };
    if (imageUrl) {
      if (imageUrl.match(/\.(jpg|jpeg|png)$/i) && imageUrl.startsWith('https://')) {
        payload.big_picture = imageUrl;
        payload.ios_attachments = { id: imageUrl };
        payload.chrome_web_image = imageUrl;
      } else {
        console.warn('URL da imagem inválida, usando imagem padrão:', imageUrl);
        payload.big_picture = "https://smv-eletronica.github.io/volei-bnh/ios/256.png";
        payload.ios_attachments = { id: "https://smv-eletronica.github.io/volei-bnh/ios/256.png" };
        payload.chrome_web_image = "https://smv-eletronica.github.io/volei-bnh/ios/256.png";
      }
    } else {
      payload.big_picture = "https://smv-eletronica.github.io/volei-bnh/ios/256.png";
      payload.ios_attachments = { id: "https://smv-eletronica.github.io/volei-bnh/ios/256.png" };
      payload.chrome_web_image = "https://smv-eletronica.github.io/volei-bnh/ios/256.png";
    }
    console.log('Enviando notificação com payload:', payload);
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic os_v2_app_mxstm4mebjal3islnw2lb2gvkxbb3l3xrrwei6mr7qdhvjl4n2shqdcbrszjb2t45lbztbfdrgjv5gplcgqqauvq4biodcb743toa4y'
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    console.log('Resposta da API do OneSignal:', data);
    console.log('Status HTTP:', response.status);
    if (!response.ok) {
      console.error('Erro na API do OneSignal:', data.errors || data);
      Swal.fire({
        icon: 'warning',
        title: 'Aviso',
        text: 'Notificação não enviada: ' + (data.errors ? JSON.stringify(data.errors) : 'Erro desconhecido'),
      });
    }
  } catch (error) {
    console.error('Erro ao enviar notificação:', error);
    Swal.fire({
      icon: 'error',
      title: 'Erro',
      text: 'Erro ao enviar notificação: ' + error.message,
    });
  }
}

export { sendPushNotification };
