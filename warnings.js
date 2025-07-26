
// warnings.js - Funções para gerenciar avisos de pendências e opções administrativas
import { getDatabase, ref, get, update } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";
//import { DateTime } from "https://moment.github.io/luxon/global/luxon.min.js";

// Função para formatar data (reutilizada para consistência)
function formatDateToBR(dateStr) {
  return DateTime.fromISO(dateStr, { zone: 'America/Sao_Paulo' }).toFormat('dd/MM/yyyy');
}

// Função para obter o mês e ano no formato yyyy-MM
function getBrazilMonthYear() {
  return DateTime.now().setZone('America/Sao_Paulo').toFormat('yyyy-MM');
}

// Verificar pendências de pagamento
async function checkPendingPayments(playerId) {
  const database = getDatabase();
  try {
    const paymentsRef = ref(database, 'payments');
    const snapshot = await get(paymentsRef);
    const payments = snapshot.val() || {};
    let pendingPayments = [];
    for (const year in payments) {
      for (const month in payments[year]) {
        const monthPayments = payments[year][month] || {};
        const playerPayments = Object.values(monthPayments).filter(
          p => (p.playerId === playerId || p.invitedById === playerId) && p.paymentStatus === 'inadimplente'
        );
        pendingPayments.push(...playerPayments.map(payment => ({
          ...payment,
          year,
          month
        })));
      }
    }
    return pendingPayments;
  } catch (error) {
    console.error('Erro ao verificar pendências de pagamento:', error);
    return [];
  }
}

// Incrementar contador de avisos
async function incrementWarningCount(playerId) {
  const database = getDatabase();
  try {
    const playerRef = ref(database, `players/${playerId}`);
    const snapshot = await get(playerRef);
    if (snapshot.exists()) {
      const playerData = snapshot.val();
      const currentWarnings = parseInt(playerData.warningCount) || 0;
      const newWarnings = currentWarnings + 1;
      await update(playerRef, { warningCount: newWarnings });
      return newWarnings;
    }
    return 0;
  } catch (error) {
    console.error('Erro ao incrementar contador de avisos:', error);
    return 0;
  }
}

// Zerar contador de avisos
async function resetWarningCount(playerId) {
  const database = getDatabase();
  try {
    const playerRef = ref(database, `players/${playerId}`);
    await update(playerRef, { warningCount: 0 });
    console.log(`Contador de avisos zerado para jogador ${playerId}`);
  } catch (error) {
    console.error('Erro ao zerar contador de avisos:', error);
  }
}

// Obter contador de avisos
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

// Função principal para gerenciar avisos de pendências
async function handlePaymentWarnings(playerId, isAdmin, emailLogado) {
  const adminEmails = ['mvvasques@msn.com', 'fabioluiztx@outlook.com', 'evandroAsyncronousFunctionCall@msn.com'];
  if (isAdmin || adminEmails.includes(emailLogado)) {
    return { allowConfirmation: true }; // Administradores não são bloqueados
  }
  const pendingPayments = await checkPendingPayments(playerId);
  if (pendingPayments.length === 0) {
    await resetWarningCount(playerId); // Zerar contador se não houver pendências
    return { allowConfirmation: true };
  }
  const warningCount = await getWarningCount(playerId);
  if (warningCount >= 2) {
    let pendenciasHTML = '<ul>';
    pendingPayments.forEach(payment => {
      const gameDate = payment.date ? formatDateToBR(payment.date) : 'Data não definida';
      pendenciasHTML += `<li>${payment.paymentType} - ${payment.guestName || payment.playerName}: R$${payment.value.toFixed(2)} (Jogo: ${gameDate})</li>`;
    });
    pendenciasHTML += '</ul>';
    await Swal.fire({
      icon: 'error',
      title: 'Bloqueado',
      html: `Você atingiu o limite de avisos (2). Não é possível confirmar presença até regularizar suas pendências.<br>${pendenciasHTML}<br>PIX: <strong>fabioluiztx@outlook.com</strong>`,
      showCancelButton: true,
      confirmButtonText: 'Copiar PIX',
      cancelButtonText: 'OK',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await navigator.clipboard.writeText('fabioluiztx@outlook.com');
          await Swal.fire({
            icon: 'success',
            title: 'Copiado!',
            text: 'Endereço PIX copiado para a área de transferência.',
            timer: 1500,
            showConfirmButton: false,
          });
        } catch (error) {
          console.error('Erro ao copiar PIX:', error);
          await Swal.fire({
            icon: 'error',
            title: 'Erro',
            text: 'Não foi possível copiar o endereço PIX.',
          });
        }
      }
    });
    return { allowConfirmation: false };
  }
  const newWarningCount = await incrementWarningCount(playerId);
  let pendenciasHTML = '<ul>';
  pendingPayments.forEach(payment => {
    const gameDate = payment.date ? formatDateToBR(payment.date) : 'Data não definida';
    pendenciasHTML += `<li>${payment.paymentType} - ${payment.guestName || payment.playerName}: R$${payment.value.toFixed(2)} (Jogo: ${gameDate})</li>`;
  });
  pendenciasHTML += '</ul>';
  await Swal.fire({
    icon: 'warning',
    title: 'Pendências de Pagamento',
    html: `Você possui pendências de pagamento:<br>${pendenciasHTML}<br>Este é seu <strong>${newWarningCount}º aviso de 2</strong>. Após o segundo aviso, você não poderá confirmar presença.<br>PIX: <strong>fabioluiztx@outlook.com</strong>`,
    showCancelButton: true,
    confirmButtonText: 'Copiar PIX',
    cancelButtonText: 'OK',
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        await navigator.clipboard.writeText('fabioluiztx@outlook.com');
        await Swal.fire({
          icon: 'success',
          title: 'Copiado!',
          text: 'Endereço PIX copiado para a área de transferência.',
          timer: 1500,
          showConfirmButton: false,
        });
      } catch (error) {
        console.error('Erro ao copiar PIX:', error);
        await Swal.fire({
          icon: 'error',
          title: 'Erro',
          text: 'Não foi possível copiar o endereço PIX.',
        });
      }
    }
  });
  return { allowConfirmation: false };
}

// Carregar jogadores notificados
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

// Configurar busca para desbloqueio de jogador
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
      } else {
        unlockAutocompleteSuggestions.style.display = 'none';
      }
    } else {
      unlockAutocompleteSuggestions.style.display = 'none';
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
        unlockPlayerSearch.value = '';
        selectedUnlockPlayerId = null;
        modalUnlockPlayerBtn.disabled = true;
        unlockAutocompleteSuggestions.style.display = 'none';
        Swal.close();
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

// Função para zerar contador ao aprovar pagamento
async function resetWarningsOnPaymentApproval(playerId, isPaid, category, invitedById) {
  if (isPaid) {
    if (category === 'CONVIDADO' && invitedById) {
      await resetWarningCount(invitedById);
    } else {
      await resetWarningCount(playerId);
    }
  }
}

// Exportar funções para uso no arquivo principal
export { handlePaymentWarnings, loadNotifiedPlayers, setupUnlockPlayerSearch, resetWarningsOnPaymentApproval };
