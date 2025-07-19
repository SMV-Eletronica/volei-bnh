import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// Lista de emails de administradores
const adminEmails = ['mvvasques@msn.com', 'fabioluiztx@outlook.com', 'teste@msn.com'];

// Initialize OneSignal
window.OneSignalDeferred = window.OneSignalDeferred || [];
OneSignalDeferred.push(async function(OneSignal) {
  try {
    await OneSignal.init({
      appId: "65e53671-840a-40bd-a24b-6db4b0e8d555",
      allowLocalhostAsSecureOrigin: true
    });
    console.log('OneSignal inicializado com sucesso.');

    // Configura tags para usuários logados
    OneSignal.User.PushSubscription.addEventListener('change', async (event) => {
      if (event.current.optedIn && window.currentUserPlayer?.id) {
        await OneSignal.login(window.currentUserPlayer.id);
        console.log(`External User ID configurado: ${window.currentUserPlayer.id}`);

        // Adiciona tags para identificação do usuário
        await OneSignal.User.addAliases({
          firebase_id: window.currentUserPlayer.id,
          crm_user_id: `crm_${window.currentUserPlayer.id}`
        });

        // Obtém o email do usuário logado do Firebase Auth
        const auth = getAuth();
        const user = auth.currentUser;

        // Verifica se o email está na lista de administradores
        if (user && user.email && adminEmails.includes(user.email)) {
          await OneSignal.User.addTag("administradores", "true");
          console.log('Usuário marcado como administrador (email: ' + user.email + ')');
        } else {
          console.log('Usuário não é administrador ou email não disponível (email: ' + (user?.email || 'não logado') + ')');
        }
      }
    });
  } catch (error) {
    console.error('Erro ao configurar OneSignal:', error);
  }
});

/**
 * Envia notificação push via OneSignal API
 * @param {string} title - Título da notificação
 * @param {string} message - Corpo da mensagem
 * @param {string|null} imageUrl - URL da imagem (opcional)
 * @param {object|null} data - Dados adicionais (opcional)
 * @param {array} segments - Segmentos de usuários (padrão: ["administradores"])
 * @returns {Promise<object>} Resposta da API
 */
async function sendPushNotification(title, message, imageUrl = null, data = null, segments = ["administradores"]) {
  try {
    const payload = {
      app_id: "65e53671-840a-40bd-a24b-6db4b0e8d555",
      headings: { en: title },
      contents: { en: message },
      included_segments: segments,
      url: data?.actionUrl || "https://smv-eletronica.github.io/volei-bnh/transparencia.html",
      data: data,
      chrome_web_icon: "https://smv-eletronica.github.io/volei-bnh/ios/256.png",
      small_icon: "ic_stat_onesignal_default",
      ios_sound: "notification.wav",
      // Desabilita agrupamento:
      android_group: null,
      thread_id: null,
      // Força notificação única:
      collapse_id: `notif_${Date.now()}`,
      android_sound: "notification"
    };

    // Adiciona imagem se fornecida e válida
    if (imageUrl && imageUrl.match(/\.(jpg|jpeg|png|gif)$/i)) {
      payload.big_picture = imageUrl;
      payload.ios_attachments = { id: imageUrl };
    } else {
      payload.big_picture = "https://smv-eletronica.github.io/volei-bnh/ios/256.png";
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

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Erro na API OneSignal:', responseData.errors || responseData);
      throw new Error(responseData.errors ? JSON.stringify(responseData.errors) : 'Erro desconhecido');
    }

    console.log('Notificação enviada com sucesso:', responseData);
    return responseData;

  } catch (error) {
    console.error('Erro ao enviar notificação:', error);
    throw error;
  }
}

/**
 * Envia notificação específica para novo comprovante (apenas para admins)
 * @param {string} playerName - Nome do jogador
 * @param {string} monthYear - Período de referência (ex: "Julho/2023")
 * @param {number} value - Valor do pagamento
 * @param {string} playerId - ID do jogador
 * @param {string} paymentId - ID do pagamento
 * @returns {Promise<object>}
 */
async function sendReceiptNotification(playerName, monthYear, value, playerId, paymentId) {
  const title = "📄 Novo Comprovante Recebido";
  const message =
    `Jogador: ${playerName}\n` +
    `Valor: R$ ${value.toFixed(2)}\n` +
    `Período: ${monthYear}\n` +
    `Status: Pendente de aprovação`;

  const customData = {
    playerId,
    paymentId,
    playerName,
    monthYear,
    value: value.toFixed(2),
    type: "new_receipt",
    actionUrl: `https://smv-eletronica.github.io/volei-bnh/transparencia.html?playerId=${playerId}`
  };

  return sendPushNotification(title, message, null, customData, ["administradores"]);
}

export { sendPushNotification, sendReceiptNotification };
