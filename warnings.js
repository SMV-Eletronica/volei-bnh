// warnings.js - Versão Corrigida (mantendo todas as funções)
import { getDatabase, ref, get, update, push } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";
const DateTime = luxon.DateTime;

// Função para formatar data
function formatDateToBR(dateStr) {
  return DateTime.fromISO(dateStr, { zone: 'America/Sao_Paulo' }).toFormat('dd/MM/yyyy');
}

// Função para obter o mês e ano no formato yyyy-MM
function getBrazilMonthYear() {
  return DateTime.now().setZone('America/Sao_Paulo').toFormat('yyyy-MM');
}

// Função principal corrigida para gerenciar avisos
async function handlePaymentWarnings(playerId, isAdmin, emailLogado) {
  const MAX_WARNINGS = 2; // 2 avisos permitidos (0=1º, 1=2º, 2=bloqueia)
  const adminEmails = ['mvvasques@msn.com', 'fabioluiztx@outlook.com', 'evandroAsyncronousFunctionCall@msn.com'];
  
  // 1. Verificar se é admin
  if (isAdmin || adminEmails.includes(emailLogado)) {
    return { 
      allowConfirmation: true,
      warningCount: 0,
      message: ''
    };
  }

  // 2. Verificar pendências
  const pendingPayments = await checkPendingPayments(playerId);
  if (pendingPayments.length === 0) {
    await resetWarningCount(playerId);
    return { 
      allowConfirmation: true,
      warningCount: 0,
      message: ''
    };
  }

  // 3. Obter avisos existentes
  const warningCount = await getWarningCount(playerId);

  // 4. Verificar se já atingiu o limite
  if (warningCount >= MAX_WARNINGS) {
    const pendenciasHTML = buildPendingPaymentsHTML(pendingPayments);
    await showBlockedAlert(pendenciasHTML);
    
    return {
      allowConfirmation: false,
      warningCount: warningCount + 1,
      message: `Você atingiu o limite de avisos (${warningCount + 1}). Regularize seus pagamentos.`
    };
  }

  // 5. Registrar novo aviso (se houver pendências)
  await registerNewWarning(playerId);

  // Mostrar alerta de aviso
  const pendenciasHTML = buildPendingPaymentsHTML(pendingPayments);
  await showWarningAlert(pendenciasHTML, warningCount + 1, MAX_WARNINGS);

  return {
    allowConfirmation: true, // Permite confirmar mesmo com aviso
    warningCount: warningCount + 1,
    message: `Este é seu ${warningCount + 1}º aviso de ${MAX_WARNINGS}.`
  };
}

// Funções auxiliares novas
function buildPendingPaymentsHTML(payments) {
  let html = '<ul style="text-align: left; margin: 10px 0;">';
  payments.forEach(payment => {
    const date = payment.date ? formatDateToBR(payment.date) : 'Data não definida';
    const name = payment.guestName || payment.playerName || 'Sem nome';
    html += `<li>${payment.paymentType} - ${name}: R$${payment.value?.toFixed(2) || '0,00'} (${date})</li>`;
  });
  html += '</ul>';
  return html;
}

async function showBlockedAlert(pendenciasHTML) {
  return Swal.fire({
    icon: 'error',
    title: 'Bloqueado',
    html: `Você atingiu o limite de avisos e não pode confirmar presença.<br><br>
           <strong>Pendências:</strong><br>${pendenciasHTML}<br>
           PIX: <strong>fabioluiztx@outlook.com</strong>`,
    showCancelButton: true,
    confirmButtonText: 'Copiar PIX',
    cancelButtonText: 'Entendi',
    showCloseButton: true
  });
}

async function showWarningAlert(pendenciasHTML, currentWarning, maxWarnings) {
  return Swal.fire({
    icon: 'warning',
    title: 'Atenção às Pendências',
    html: `Você possui pagamentos pendentes:<br><br>
           <strong>Pendências:</strong><br>${pendenciasHTML}<br>
           Este é seu <strong>${currentWarning}º aviso de ${maxWarnings}</strong>.<br>
           PIX: <strong>fabioluiztx@outlook.com</strong>`,
    showCancelButton: true,
    confirmButtonText: 'Copiar PIX',
    cancelButtonText: 'Entendi',
    showCloseButton: true
  });
}

async function registerNewWarning(playerId) {
  const newWarningRef = push(ref(getDatabase(), `warnings/${playerId}`));
  await update(newWarningRef, {
    timestamp: DateTime.now().setZone('America/Sao_Paulo').toISO(),
    reason: 'Pagamento pendente',
    viewed: false
  });
  
  // Atualizar contador
  const currentCount = await getWarningCount(playerId);
  await update(ref(getDatabase(), `players/${playerId}`), {
    warningCount: currentCount + 1
  });
}

// Funções existentes mantidas com pequenos ajustes
async function checkPendingPayments(playerId) {
  const database = getDatabase();
  const paymentsRef = ref(database, 'payments');
  const snapshot = await get(paymentsRef);
  const payments = snapshot.val() || {};
  
  let pendingPayments = [];
  
  for (const year in payments) {
    for (const month in payments[year]) {
      const monthPayments = payments[year][month] || {};
      pendingPayments.push(
        ...Object.values(monthPayments).filter(p => 
          (p.playerId === playerId || p.invitedById === playerId) && 
          p.paymentStatus === 'inadimplente'
        )
      );
    }
  }
  
  return pendingPayments;
}

async function getWarningCount(playerId) {
  const database = getDatabase();
  try {
    const playerRef = ref(database, `players/${playerId}`);
    const snapshot = await get(playerRef);
    if (snapshot.exists()) {
      return parseInt(snapshot.val().warningCount) || 0;
    }
    return 0;
  } catch (error) {
    console.error('Erro ao obter contador de avisos:', error);
    return 0;
  }
}

async function resetWarningCount(playerId) {
  try {
    // Limpa todos os avisos
    await update(ref(getDatabase(), `warnings/${playerId}`), null);
    // Zera o contador
    await update(ref(getDatabase(), `players/${playerId}`), {
      warningCount: 0
    });
  } catch (error) {
    console.error('Erro ao resetar avisos:', error);
  }
}

async function loadNotifiedPlayers() {
  const notifiedList = document.getElementById('notifiedPlayersList');
  notifiedList.innerHTML = '<p>Carregando...</p>';
  const database = getDatabase();
  try {
    const playersRef = ref(database, 'players');
    const snapshot = await get(playersRef);
    if (snapshot.exists()) {
      const players = Object.entries(snapshot.val()).map(([id, player]) => ({
        id,
        ...player
      }));
      const notifiedPlayers = players.filter(player => (player.warningCount || 0) > 0);
      if (notifiedPlayers.length === 0) {
        notifiedList.innerHTML = '<p>Nenhum jogador notificado.</p>';
      } else {
        const html = notifiedPlayers.map(player => `
          <div class="player-item">
            <span>${player.name} (${player.email}) - Avisos: ${player.warningCount}</span>
            <button onclick="resetPlayerWarnings('${player.id}')" class="player-action">Zerar</button>
          </div>
        `).join('');
        notifiedList.innerHTML = html;
      }
    } else {
      notifiedList.innerHTML = '<p>Nenhum jogador encontrado.</p>';
    }
  } catch (error) {
    console.error('Erro ao carregar jogadores notificados:', error);
    notifiedList.innerHTML = '<p>Erro ao carregar lista.</p>';
  }
}

function setupUnlockPlayerSearch() {
  const unlockPlayerSearch = document.getElementById('unlockPlayerSearch');
  const unlockAutocompleteSuggestions = document.getElementById('unlockAutocompleteSuggestions');
  const modalUnlockPlayerBtn = document.getElementById('modalUnlockPlayerBtn');
  let selectedUnlockPlayerId = null;
  
  unlockPlayerSearch.addEventListener('input', () => {
    const query = unlockPlayerSearch.value.trim().toLowerCase();
    unlockAutocompleteSuggestions.innerHTML = '';
    selectedUnlockPlayerId = null;
    modalUnlockPlayerBtn.disabled = true;
    
    if (query.length > 0) {
      const suggestions = window.allPlayers
        .filter(player => player.name?.toLowerCase().includes(query) && (player.warningCount || 0) > 0)
        .slice(0, 5);
      
      if (suggestions.length > 0) {
        suggestions.forEach(player => {
          const div = document.createElement('div');
          div.className = 'autocomplete-suggestion';
          div.textContent = `${player.name} (${player.warningCount} avisos)`;
          div.addEventListener('click', () => {
            unlockPlayerSearch.value = player.name;
            selectedUnlockPlayerId = player.id;
            modalUnlockPlayerBtn.disabled = false;
            unlockAutocompleteSuggestions.style.display = 'none';
          });
          unlockAutocompleteSuggestions.appendChild(div);
        });
        unlockAutocompleteSuggestions.style.display = 'block';
      }
    }
  });

  unlockPlayerSearch.addEventListener('blur', () => {
    setTimeout(() => {
      unlockAutocompleteSuggestions.style.display = 'none';
    }, 200);
  });

  modalUnlockPlayerBtn.addEventListener('click', async () => {
    if (selectedUnlockPlayerId) {
      try {
        await resetWarningCount(selectedUnlockPlayerId);
        await Swal.fire({
          icon: 'success',
          title: 'Sucesso',
          text: 'Jogador desbloqueado e contador de avisos zerado.',
        });
        loadNotifiedPlayers(); // Atualiza a lista
      } catch (error) {
        console.error('Erro ao desbloquear jogador:', error);
        await Swal.fire({
          icon: 'error',
          title: 'Erro',
          text: 'Erro ao desbloquear jogador.',
        });
      }
    }
  });
}

async function resetWarningsOnPaymentApproval(playerId, isPaid, category, invitedById) {
  if (isPaid) {
    const targetPlayerId = (category === 'CONVIDADO' && invitedById) ? invitedById : playerId;
    await resetWarningCount(targetPlayerId);
  }
}

// Exportar todas as funções
export { 
  handlePaymentWarnings, 
  loadNotifiedPlayers, 
  setupUnlockPlayerSearch, 
  resetWarningsOnPaymentApproval 
};

// Função global para uso no HTML
window.resetPlayerWarnings = async function(playerId) {
  await resetWarningCount(playerId);
  loadNotifiedPlayers();
};
