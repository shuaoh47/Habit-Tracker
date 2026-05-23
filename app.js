/* ==========================================
   AURA Habit Tracker - Core Application Script (Mobile Web App)
   ========================================== */

// State Management
let habits = [];
let currentCalendarMonth = new Date().getMonth();
let currentCalendarYear = new Date().getFullYear();

// Helper to get relative dates as YYYY-MM-DD strings relative to today
function getRelativeDate(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

// Pre-load stunning mock data on first launch so the dashboard is immediately rich and interactive
function checkAndPreloadData() {
  const stored = localStorage.getItem("aura_habits");
  if (stored) {
    habits = JSON.parse(stored);
    return;
  }

  // Define mock habits
  const mockHabits = [
    {
      id: "mock-1",
      name: "책 읽기",
      description: "하루 30분 책 읽기",
      category: "study",
      goalQuantity: 30,
      goalUnit: "분",
      frequency: "daily",
      startDate: getRelativeDate(10),
      endDate: getRelativeDate(-20), // 20 days in the future
      archived: false,
      history: [
        getRelativeDate(10),
        getRelativeDate(9),
        getRelativeDate(8),
        getRelativeDate(6),
        getRelativeDate(5),
        getRelativeDate(2),
        getRelativeDate(1)
      ],
      originalGoal: null
    },
    {
      id: "mock-2",
      name: "매일 스쿼트",
      description: "매일 30회 스쿼트 완료",
      category: "health",
      goalQuantity: 30,
      goalUnit: "회",
      frequency: "daily",
      startDate: getRelativeDate(7),
      endDate: null,
      archived: false,
      // Active 8-day streak including today
      history: [
        getRelativeDate(7),
        getRelativeDate(6),
        getRelativeDate(5),
        getRelativeDate(4),
        getRelativeDate(3),
        getRelativeDate(2),
        getRelativeDate(1),
        getRelativeDate(0)
      ],
      originalGoal: null
    },
    {
      id: "mock-3",
      name: "아침 명상",
      description: "아침 차 마시며 10분 호흡 집중",
      category: "mind",
      goalQuantity: 10,
      goalUnit: "분",
      frequency: "daily",
      startDate: getRelativeDate(4),
      endDate: null,
      archived: false,
      history: [
        getRelativeDate(4),
        getRelativeDate(3),
        getRelativeDate(1),
        getRelativeDate(0)
      ],
      originalGoal: null
    }
  ];

  localStorage.setItem("aura_habits", JSON.stringify(mockHabits));
  habits = mockHabits;
}

// Calculate streak details for a single habit
function calculateStreak(history) {
  if (history.length === 0) return { current: 0, max: 0 };
  
  // Sort history ascending
  const sorted = [...history].map(d => new Date(d)).sort((a, b) => a - b);
  const todayStr = getRelativeDate(0);
  const yesterdayStr = getRelativeDate(1);
  
  let currentStreak = 0;
  let maxStreak = 0;
  let runningStreak = 0;
  
  const hasToday = history.includes(todayStr);
  const hasYesterday = history.includes(yesterdayStr);
  
  if (!hasToday && !hasYesterday) {
    currentStreak = 0;
  }

  // Iterate chronologically to find consecutive days
  for (let i = 0; i < sorted.length; i++) {
    if (i === 0) {
      runningStreak = 1;
    } else {
      const diffTime = Math.abs(sorted[i] - sorted[i - 1]);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        runningStreak++;
      } else if (diffDays > 1) {
        if (runningStreak > maxStreak) maxStreak = runningStreak;
        runningStreak = 1;
      }
    }
  }
  
  if (runningStreak > maxStreak) maxStreak = runningStreak;
  
  if (hasToday || hasYesterday) {
    currentStreak = runningStreak;
  } else {
    currentStreak = 0;
  }
  
  return { current: currentStreak, max: maxStreak };
}

// Synchronize all dashboard stats card metrics
function syncStats() {
  const activeHabits = habits.filter(h => !h.archived);
  
  const statsActiveCount = document.getElementById("stats-active-count");
  if (statsActiveCount) statsActiveCount.innerText = activeHabits.length;
  
  const thisMonthPrefix = new Date().toISOString().substring(0, 7); // YYYY-MM
  let totalMonthCompletions = 0;
  let overallMaxStreak = 0;
  
  activeHabits.forEach(h => {
    h.history.forEach(dateStr => {
      if (dateStr.startsWith(thisMonthPrefix)) {
        totalMonthCompletions++;
      }
    });
    
    const streaks = calculateStreak(h.history);
    if (streaks.max > overallMaxStreak) {
      overallMaxStreak = streaks.max;
    }
  });
  
  const statsTotalChecked = document.getElementById("stats-total-checked");
  if (statsTotalChecked) statsTotalChecked.innerText = totalMonthCompletions;

  const statsMaxStreak = document.getElementById("stats-max-streak");
  if (statsMaxStreak) statsMaxStreak.innerText = `${overallMaxStreak}일`;

  // Global header streaks & active rates
  let largestActiveStreak = 0;
  let totalChecksLast7Days = 0;
  let totalActiveOpportunities = activeHabits.length * 7;
  
  activeHabits.forEach(h => {
    const streaks = calculateStreak(h.history);
    if (streaks.current > largestActiveStreak) {
      largestActiveStreak = streaks.current;
    }
    
    // Count checks in last 7 days
    for (let i = 0; i < 7; i++) {
      const dateStr = getRelativeDate(i);
      if (h.history.includes(dateStr)) {
        totalChecksLast7Days++;
      }
    }
  });

  const completionRate = totalActiveOpportunities > 0 
    ? Math.round((totalChecksLast7Days / totalActiveOpportunities) * 100) 
    : 0;

  const globalStreak = document.getElementById("global-streak");
  if (globalStreak) globalStreak.innerText = `${largestActiveStreak}`;

  const globalCompletion = document.getElementById("global-completion");
  if (globalCompletion) globalCompletion.innerText = `${completionRate}%`;
}

// Toggle habit complete state for Today
function toggleCheckToday(habitId) {
  const todayStr = getRelativeDate(0);
  const habit = habits.find(h => h.id === habitId);
  if (!habit) return;

  const index = habit.history.indexOf(todayStr);
  if (index === -1) {
    habit.history.push(todayStr);
    playCheckAnimation(habitId);
  } else {
    habit.history.splice(index, 1);
  }

  saveToStorage();
  renderDashboard();
  renderCalendar();
  syncStats();
}

function playCheckAnimation(habitId) {
  const card = document.querySelector(`.habit-item[data-id="${habitId}"]`);
  if (!card) return;
  card.style.transform = "scale(1.02)";
  setTimeout(() => {
    card.style.transform = "scale(1)";
  }, 150);
}

// Mobile Tab View Switcher Engine
function switchTab(tabId) {
  // Toggle navigation tab active classes
  document.querySelectorAll(".nav-tab").forEach(tab => {
    if (tab.getAttribute("data-tab") === tabId) {
      tab.classList.add("active");
    } else {
      tab.classList.remove("active");
    }
  });

  // Toggle content section views active classes
  document.querySelectorAll(".tab-view").forEach(view => {
    if (view.id === tabId) {
      view.classList.add("active");
    } else {
      view.classList.remove("active");
    }
  });
  
  // Re-scroll container to top when changing views
  window.scrollTo({ top: 0, behavior: 'instant' });
}

// Render primary daily checklist
function renderDashboard() {
  const container = document.getElementById("habit-list-container");
  container.innerHTML = "";
  
  const activeHabits = habits.filter(h => !h.archived);
  
  if (activeHabits.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>기록된 습관이 없습니다.<br>오른쪽 보관함 탭에서 새로운 습관을 추가해 보세요!</p>
      </div>
    `;
    return;
  }

  const todayStr = getRelativeDate(0);

  activeHabits.forEach(habit => {
    const isCompletedToday = habit.history.includes(todayStr);
    const streaks = calculateStreak(habit.history);
    
    const item = document.createElement("div");
    item.className = `habit-item ${habit.category} ${isCompletedToday ? 'checked' : ''}`;
    item.setAttribute("data-id", habit.id);

    let freqText = habit.frequency === "daily" ? "매일" : `주 ${habit.frequency.split('-')[1]}회`;
    let goalText = `${habit.goalQuantity}${habit.goalUnit}`;

    item.innerHTML = `
      <div class="habit-left-group">
        <button class="checklist-button" aria-label="완료 체크">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </button>
        <div class="habit-details">
          <div class="habit-name-wrapper">
            <span class="habit-title">${habit.name}</span>
          </div>
          <span class="habit-sub">${freqText} • ${goalText} ${habit.description ? `• ${habit.description}` : ''}</span>
        </div>
      </div>
      <div class="habit-right-group">
        <div class="streak-counter">
          <span>🔥</span>
          <span>+ ${streaks.current}</span>
        </div>
      </div>
    `;

    // Click checkbox toggles complete state
    item.querySelector(".checklist-button").onclick = (e) => {
      e.stopPropagation();
      toggleCheckToday(habit.id);
    };

    // Tapping the card redirects the user to Calendar Tab instantly (Slick Mobile Gesture!)
    item.onclick = () => {
      document.getElementById("calendar-habit-select").value = habit.id;
      renderCalendar();
      switchTab("view-calendar");
    };

    container.appendChild(item);
  });
}

// Render active habits directory list in sidebar
function renderDirectory() {
  const container = document.getElementById("directory-list-container");
  container.innerHTML = "";
  
  if (habits.length === 0) {
    container.innerHTML = `<div class="empty-state" style="padding: 15px;"><p>등록된 습관이 없습니다.</p></div>`;
    return;
  }

  habits.forEach(habit => {
    const item = document.createElement("div");
    item.className = "dir-item";
    item.innerHTML = `
      <span class="dir-name ${habit.category} ${habit.archived ? 'text-muted' : ''}">
        ${habit.name} ${habit.archived ? '(보관됨)' : ''}
      </span>
      <div class="dir-actions">
        <button class="dir-btn edit" data-id="${habit.id}" title="습관 편집">✏️</button>
        <button class="dir-btn delete" data-id="${habit.id}" title="습관 삭제">🗑️</button>
      </div>
    `;
    
    item.querySelector(".edit").onclick = (e) => {
      e.stopPropagation();
      openEditModal(habit.id);
    };

    item.querySelector(".delete").onclick = (e) => {
      e.stopPropagation();
      deleteHabit(habit.id);
    };

    container.appendChild(item);
  });

  // Populate calendar selector dropdown
  const select = document.getElementById("calendar-habit-select");
  const currentValue = select.value;
  select.innerHTML = `<option value="global">전체 습관 현황</option>`;
  
  habits.filter(h => !h.archived).forEach(h => {
    const opt = document.createElement("option");
    opt.value = h.id;
    opt.innerText = h.name;
    select.appendChild(opt);
  });
  
  if (habits.find(h => h.id === currentValue && !h.archived)) {
    select.value = currentValue;
  } else {
    select.value = "global";
  }
}

// Render customized Interactive Grid Calendar
function renderCalendar() {
  const container = document.getElementById("calendar-days-container");
  container.innerHTML = "";

  const selectedHabitId = document.getElementById("calendar-habit-select").value;
  const habit = habits.find(h => h.id === selectedHabitId);

  const monthLabels = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
  document.getElementById("cal-month-year").innerText = `${currentCalendarYear}년 ${monthLabels[currentCalendarMonth]}`;

  const firstDay = new Date(currentCalendarYear, currentCalendarMonth, 1).getDay();
  const totalDays = new Date(currentCalendarYear, currentCalendarMonth + 1, 0).getDate();

  // Offset empty days
  for (let i = 0; i < firstDay; i++) {
    const emptyCell = document.createElement("div");
    emptyCell.className = "day-cell empty-day";
    container.appendChild(emptyCell);
  }

  // Draw cells
  for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
    const cell = document.createElement("div");
    cell.className = "day-cell";
    cell.innerText = dayNum;

    const cellDateStr = `${currentCalendarYear}-${String(currentCalendarMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const cellDate = new Date(cellDateStr);
    const todayStr = getRelativeDate(0);

    if (cellDateStr === todayStr) {
      cell.classList.add("today-cell");
    }

    if (selectedHabitId === "global") {
      let anyCompleted = false;
      habits.filter(h => !h.archived).forEach(h => {
        if (h.history.includes(cellDateStr)) {
          anyCompleted = true;
        }
      });
      if (anyCompleted) {
        cell.classList.add("checked-day");
      }
    } else if (habit) {
      const start = new Date(habit.startDate);
      const end = habit.endDate ? new Date(habit.endDate) : null;

      const isStartDay = cellDateStr === habit.startDate;
      const isEndDay = habit.endDate && (cellDateStr === habit.endDate);
      
      if (isStartDay) cell.classList.add("start-date");
      if (isEndDay) cell.classList.add("end-date");

      const isInRange = cellDate >= start && (!end || cellDate <= end);
      if (isInRange) {
        cell.classList.add("active-range-bg");
        if (dayNum === 1 || (firstDay + dayNum - 1) % 7 === 0) {
          cell.classList.add("active-range-bg-start");
        }
        if (dayNum === totalDays || (firstDay + dayNum - 1) % 7 === 6) {
          cell.classList.add("active-range-bg-end");
        }
      }

      const isChecked = habit.history.includes(cellDateStr);
      if (isChecked) {
        cell.classList.add("checked-day");

        // Calculate horizontal visual streak connections
        const prevDay = new Date(cellDate);
        prevDay.setDate(prevDay.getDate() - 1);
        const prevDayStr = prevDay.toISOString().split('T')[0];
        
        const nextDay = new Date(cellDate);
        nextDay.setDate(nextDay.getDate() + 1);
        const nextDayStr = nextDay.toISOString().split('T')[0];

        const hasPrevChecked = habit.history.includes(prevDayStr);
        const hasNextChecked = habit.history.includes(nextDayStr);

        const weekdayIndex = cellDate.getDay();

        // Connect only if they don't break row lines
        if (hasPrevChecked && weekdayIndex !== 0) {
          cell.classList.add("streak-connect-prev");
        }
        if (hasNextChecked && weekdayIndex !== 6) {
          cell.classList.add("streak-connect-next");
        }
      }
    }

    if (selectedHabitId !== "global") {
      cell.onclick = () => {
        const habitIdx = habits.findIndex(h => h.id === selectedHabitId);
        if (habitIdx === -1) return;
        
        const histIdx = habits[habitIdx].history.indexOf(cellDateStr);
        if (histIdx === -1) {
          habits[habitIdx].history.push(cellDateStr);
        } else {
          habits[habitIdx].history.splice(histIdx, 1);
        }
        saveToStorage();
        renderDashboard();
        renderCalendar();
        syncStats();
      };
    }

    container.appendChild(cell);
  }
}

function getCategoryName(cat) {
  const map = {
    health: "건강",
    study: "학습",
    mind: "명상",
    finance: "자산",
    creative: "취미",
    routine: "일상"
  };
  return map[cat] || "기타";
}

function saveToStorage() {
  localStorage.setItem("aura_habits", JSON.stringify(habits));
}

function deleteHabit(id) {
  if (confirm("정말로 이 습관을 완전히 삭제하시겠습니까? 데이터 복구가 불가능합니다.")) {
    habits = habits.filter(h => h.id !== id);
    saveToStorage();
    renderDashboard();
    renderDirectory();
    renderCalendar();
    syncStats();
  }
}

// Form Add / Edit Actions
const modal = document.getElementById("habit-modal");
const form = document.getElementById("habit-form");

form.addEventListener("submit", (e) => {
  e.preventDefault();
  
  const idInput = document.getElementById("edit-habit-id").value;
  const name = document.getElementById("habit-name").value;
  const qty = parseInt(document.getElementById("habit-qty").value);
  const unit = document.getElementById("habit-unit").value;
  
  const selectedCatInput = document.querySelector('input[name="habit-category"]:checked');
  const category = selectedCatInput ? selectedCatInput.value : "health";
  
  const freq = document.getElementById("habit-frequency").value;
  const start = document.getElementById("habit-start-date").value;
  const endInput = document.getElementById("habit-end-date").value;
  const end = endInput === "" ? null : endInput;

  if (idInput !== "") {
    const habit = habits.find(h => h.id === idInput);
    if (habit) {
      habit.name = name;
      habit.goalQuantity = qty;
      habit.goalUnit = unit;
      habit.category = category;
      habit.frequency = freq;
      habit.startDate = start;
      habit.endDate = end;
    }
  } else {
    const newHabit = {
      id: "habit-" + Date.now(),
      name: name,
      description: "",
      category: category,
      goalQuantity: qty,
      goalUnit: unit,
      frequency: freq,
      startDate: start,
      endDate: end,
      archived: false,
      history: [],
      originalGoal: null
    };
    habits.push(newHabit);
  }

  saveToStorage();
  renderDashboard();
  renderDirectory();
  renderCalendar();
  syncStats();
  
  form.reset();
  document.getElementById("edit-habit-id").value = "";
  document.getElementById("modal-title").innerText = "새로운 습관 만들기";
  document.getElementById("save-habit-btn").innerText = "만들기";
  
  modal.close();
});

function openEditModal(id) {
  const habit = habits.find(h => h.id === id);
  if (!habit) return;
  
  document.getElementById("edit-habit-id").value = habit.id;
  document.getElementById("habit-name").value = habit.name;
  document.getElementById("habit-qty").value = habit.goalQuantity;
  document.getElementById("habit-unit").value = habit.goalUnit;
  
  const radio = document.querySelector(`input[name="habit-category"][value="${habit.category}"]`);
  if (radio) radio.checked = true;

  document.getElementById("habit-frequency").value = habit.frequency;
  document.getElementById("habit-start-date").value = habit.startDate;
  document.getElementById("habit-end-date").value = habit.endDate || "";

  document.getElementById("modal-title").innerText = "습관 세부 편집";
  document.getElementById("save-habit-btn").innerText = "수정 완료";
  
  modal.showModal();
}

// Hook dialog trigger listeners to reset forms properly
document.querySelectorAll('button[commandfor="habit-modal"][command="show-modal"]').forEach(btn => {
  btn.addEventListener("click", () => {
    form.reset();
    document.getElementById("edit-habit-id").value = "";
    document.getElementById("modal-title").innerText = "새로운 습관 만들기";
    document.getElementById("save-habit-btn").innerText = "만들기";
    document.getElementById("habit-start-date").value = getRelativeDate(0);
  });
});

// Calendar navigation triggers
document.getElementById("cal-prev-btn").onclick = () => {
  currentCalendarMonth--;
  if (currentCalendarMonth < 0) {
    currentCalendarMonth = 11;
    currentCalendarYear--;
  }
  renderCalendar();
};
document.getElementById("cal-next-btn").onclick = () => {
  currentCalendarMonth++;
  if (currentCalendarMonth > 11) {
    currentCalendarMonth = 0;
    currentCalendarYear++;
  }
  renderCalendar();
};

document.getElementById("calendar-habit-select").onchange = () => {
  renderCalendar();
};

// Bind Bottom Navigation Clicks immediately
function bindNavEvents() {
  document.querySelectorAll(".nav-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      const tabId = tab.getAttribute("data-tab");
      switchTab(tabId);
    });
  });
}

// Start application
function initApp() {
  checkAndPreloadData();
  bindNavEvents();
  renderDashboard();
  renderDirectory();
  renderCalendar();
  syncStats();
}

window.onload = initApp;
