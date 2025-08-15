(function(){
	console.log('🚀 Universities.js загружен');
	
	const grid = document.getElementById('uniGrid');
	const searchInput = document.getElementById('searchInput');
	const specFilter = document.getElementById('specFilter');

	console.log('🔍 Найденные элементы:', { grid, searchInput, specFilter });

	let universities = [];
	let specializations = [];

	function render(list){
		console.log('🎨 Рендеринг списка:', list?.length || 0);
		
		// Обновляем статистику
		const uniqueUnis = new Set();
		list.forEach(u => uniqueUnis.add(u.name));
		
		// Получаем уникальные специальности
		const uniqueSpecs = new Set();
		list.forEach(u => { if(u.specialization) uniqueSpecs.add(u.specialization); });
		
		const uniqueCount = document.getElementById('uniqueUniCount');
		const totalCount = document.getElementById('totalSpecsCount');
		
		if (uniqueCount) {
			const uniCount = uniqueUnis.size;
			const uniText = getRussianPlural(uniCount, 'вуз', 'вуза', 'вузов');
			uniqueCount.textContent = `${uniCount} ${uniText}`;
		}
		if (totalCount) {
			const specCount = uniqueSpecs.size;
			const specText = getRussianPlural(specCount, 'специальность', 'специальности', 'специальностей');
			totalCount.textContent = `${specCount} ${specText}`;
		}
		
		if(!grid) {
			console.error('❌ Grid элемент не найден!');
			return;
		}
		if(!list || list.length === 0){
			grid.innerHTML = '<div class="uni-empty">Ничего не найдено</div>';
			return;
		}
		
		// Группируем университеты по названию
		const groupedUnis = {};
		list.forEach(u => {
			if (!groupedUnis[u.name]) {
				groupedUnis[u.name] = {
					name: u.name,
					city: u.city,
					url: u.url,
					specializations: []
				};
			}
			groupedUnis[u.name].specializations.push({
				name: u.specialization || 'Без специализации',
				score_min: u.score_min,
				score_max: u.score_max
			});
		});
		
		// Рендерим сгруппированные университеты
		grid.innerHTML = Object.values(groupedUnis).map(uni => {
			const link = uni.url ? `<a class="btn btn-primary" href="${uni.url}" target="_blank" rel="noopener">Перейти на сайт</a>` : '';
			
			const specializationsHtml = uni.specializations.map(spec => {
				const score = (spec.score_min != null && spec.score_max != null)
					? `${spec.score_min}–${spec.score_max}`
					: '—';
				return `
					<div class="spec-item">
						<span class="spec-name">${escapeHtml(spec.name)}</span>
						<span class="spec-score">${score}</span>
					</div>
				`;
			}).join('');
			
			return `
				<div class="uni-card">
					<div class="uni-card-head">
						<h3 class="uni-title">${escapeHtml(uni.name)}</h3>
						<div class="uni-meta">
							<div class="uni-meta-item"><i class="fas fa-location-dot"></i><span>${escapeHtml(uni.city || '—')}</span></div>
						</div>
					</div>
					<div class="uni-specializations">
						<h4 class="specs-title">Специальности:</h4>
						${specializationsHtml}
					</div>
					<div class="uni-actions">
						${link}
					</div>
				</div>
			`;
		}).join('');
		console.log('✅ Рендеринг завершен');
	}

	function escapeHtml(str){
		return String(str)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;');
	}
	
	// Функция для правильных окончаний в русском языке
	function getRussianPlural(count, one, two, five) {
		const mod10 = count % 10;
		const mod100 = count % 100;
		
		if (mod100 >= 11 && mod100 <= 19) return five;
		if (mod10 === 1) return one;
		if (mod10 >= 2 && mod10 <= 4) return two;
		return five;
	}

	function applyFilters(){
		const q = (searchInput.value || '').toLowerCase().trim();
		const spec = specFilter.value;
		const filtered = universities.filter(u => {
			const matchesQuery = !q || (u.name && u.name.toLowerCase().includes(q)) || (u.city && u.city.toLowerCase().includes(q));
			const matchesSpec = !spec || (u.specialization === spec);
			return matchesQuery && matchesSpec;
		});
		render(filtered);
	}

	function populateSpecs(){
		const set = new Set();
		universities.forEach(u => { if(u.specialization){ set.add(u.specialization); } });
		specializations = Array.from(set).sort();
		specializations.forEach(s => {
			const opt = document.createElement('option');
			opt.value = s;
			opt.textContent = s;
			specFilter.appendChild(opt);
		});
	}

	function initEvents(){
		searchInput.addEventListener('input', applyFilters);
		specFilter.addEventListener('change', applyFilters);
	}

	// Попытка загрузить данные
	function loadData() {
		console.log('🔄 Начинаю загрузку данных...');
		
		// Сначала проверяем встроенные данные
		if (window.EMBEDDED_UNIVERSITIES && window.EMBEDDED_UNIVERSITIES.length > 0) {
			console.log('✅ Использую встроенные данные, вузов:', window.EMBEDDED_UNIVERSITIES.length);
			universities = window.EMBEDDED_UNIVERSITIES;
			populateSpecs();
			initEvents();
			render(universities);
			return;
		}
		
		// Если встроенных данных нет, пробуем загрузить через fetch
		fetch('universities.json', { 
			cache: 'no-store',
			method: 'GET'
		})
		.then(r => {
			console.log('📡 Ответ сервера:', r.status, r.statusText);
			if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
			return r.text();
		})
		.then(text => {
			console.log('📄 Получен текст длиной:', text.length);
			try {
				const data = JSON.parse(text);
				console.log('✅ JSON успешно распарсен, вузов:', data.length);
				universities = Array.isArray(data) ? data : [];
				populateSpecs();
				initEvents();
				render(universities);
			} catch (parseError) {
				console.error('❌ Ошибка парсинга JSON:', parseError);
				throw parseError;
			}
		})
		.catch(err => {
			console.error('❌ Ошибка загрузки:', err);
			console.log('🔄 Переключаюсь на демо-данные...');
			// Показываем демо-данные если не удалось загрузить
			universities = getDemoData();
			populateSpecs();
			initEvents();
			render(universities);
		});
	}

	// Демо-данные на случай если JSON не загружается
	function getDemoData() {
		return [
			{
				"name": "БелГУ",
				"location": "Белгород",
				"score_min": 220,
				"score_max": 250,
				"url": "https://bsu.edu.ru",
				"specialization": "Программная инженерия"
			},
			{
				"name": "ВГУ",
				"location": "Воронеж",
				"score_min": 225,
				"score_max": 255,
				"url": "https://www.vsu.ru",
				"specialization": "Data Science"
			},
			{
				"name": "МГУ",
				"location": "Москва",
				"score_min": 280,
				"score_max": 300,
				"url": "https://www.msu.ru",
				"specialization": "AI/ML инженерия"
			}
		];
	}

	// Ждем загрузки DOM
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', loadData);
	} else {
		loadData();
	}
})(); 