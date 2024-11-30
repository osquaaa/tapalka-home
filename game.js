let username = localStorage.getItem('username') || 'guest (без аккаунта)'
let token = localStorage.getItem('token')
let score = 0
let coins = 0
let coinsPerClick = 1
let multiplier = 1

const apiUrl = 'https://tapalka-arqm.onrender.com' // Ваш адрес на Render

function updateUI() {
	const registerForm = document.getElementById('register-form')
	const loginForm = document.getElementById('login-form')
	const logoutBtn = document.getElementById('logout-btn')
	const greeting = document.getElementById('greeting')
	const scoreElement = document.getElementById('score')
	const coinsElement = document.getElementById('coins')
	const upgradeClickElement = document.getElementById('upgrade-click')
	const upgradeDoubleElement = document.getElementById('upgrade-double')

	// Если пользователь авторизован
	if (token) {
		registerForm.style.display = 'none' // Скрыть форму регистрации
		loginForm.style.display = 'none' // Скрыть форму авторизации
		logoutBtn.style.display = 'block' // Показать кнопку выхода
		greeting.textContent = `Привет, ${username}` // Показать приветствие
	} else {
		registerForm.style.display = 'block' // Показать форму регистрации
		loginForm.style.display = 'block' // Показать форму авторизации
		logoutBtn.style.display = 'none' // Скрыть кнопку выхода
		greeting.textContent = '' // Убрать приветствие
	}

	// Обновление UI с данными пользователя
	scoreElement.textContent = `Очков: ${score}`
	coinsElement.textContent = `Монеты: ${coins}`
	upgradeClickElement.textContent = `+1 К КЛИКУ (${coinsPerClick * 100} монет)`
	upgradeDoubleElement.textContent = `ДАБЛ КЛИК (${multiplier * 10000} монет)`
}

// Функция для создания летящих точек на фоне
function createDots() {
	const numDots = 50 // Количество точек
	const background = document.getElementById('background-dots')

	for (let i = 0; i < numDots; i++) {
		const dot = document.createElement('div')
		dot.classList.add('dot')
		dot.style.width = `${Math.random() * 5 + 3}px` // Размер точки
		dot.style.height = dot.style.width
		dot.style.top = `${Math.random() * 100}vh` // Случайное положение по вертикали
		dot.style.left = `${Math.random() * 100}vw` // Случайное положение по горизонтали
		background.appendChild(dot)
	}
}

// Функция для обновления данных пользователя
async function fetchUser() {
	if (!token) return

	try {
		const response = await fetch(`${apiUrl}/user/${username}`, {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		})
		if (!response.ok) {
			throw new Error('Пользователь не найден')
		}
		const user = await response.json()
		score = user.score
		coins = user.coins
		coinsPerClick = user.coinsPerClick
		multiplier = user.multiplier

		// Показать приветствие после успешной загрузки данных пользователя
		updateUI()
	} catch (err) {
		alert(err.message)
	}
}

// Функция для получения топа пользователей
async function fetchTopUsers() {
	try {
		const response = await fetch(`${apiUrl}/top-users`)
		if (!response.ok) {
			throw new Error('Ошибка при получении топа пользователей')
		}
		const users = await response.json()
		displayTopUsers(users) // Обновляем интерфейс с топом
	} catch (err) {
		alert(err.message)
	}
}

// Функция для отображения топа пользователей
function displayTopUsers(users) {
	const topUsersList = document.getElementById('top-users')
	topUsersList.innerHTML = '' // Очищаем текущий список

	users.forEach((user, index) => {
		const userElement = document.createElement('p')
		let prizeText = ''
		if (index === 0) {
			userElement.classList.add('top-user', 'gold')
			prizeText = '(500 руб)'
		} else if (index === 1) {
			userElement.classList.add('top-user', 'silver')
			prizeText = '(300 руб)'
		} else if (index === 2) {
			userElement.classList.add('top-user', 'bronze')
			prizeText = '(250 руб)'
		} else if (index === 9) {
			userElement.classList.add('top-user', 'looser')
			prizeText = '(ЛОХ)'
		} else {
			userElement.classList.add('top-user')
		}

		userElement.innerHTML = `${user.username}: ${user.score} очков <span class="prize">${prizeText}</span>`
		topUsersList.appendChild(userElement)
	})
}

// Загружаем топ пользователей при загрузке страницы
fetchTopUsers()
setInterval(fetchTopUsers, 7000)

// Функция для клика по монете
async function clickCoin() {
	if (!token) return
	try {
		const response = await fetch(`${apiUrl}/click/${username}`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
			},
		})
		if (!response.ok) {
			throw new Error('Ошибка при обработке клика')
		}
		const user = await response.json()
		score = user.score
		coins = user.coins
		updateUI()
	} catch (err) {
		alert(err.message)
	}
}

// Функция для покупки +1 к монетам за клик
async function buyClickUpgrade() {
	if (!token) return
	try {
		const response = await fetch(`${apiUrl}/upgrade/click/${username}`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
			},
		})
		if (!response.ok) {
			const data = await response.json()
			throw new Error(data.message || 'Ошибка при покупке улучшения')
		}
		const data = await response.json()
		alert(data.message)
		fetchUser() // Обновляем данные пользователя после покупки
	} catch (err) {
		alert(err.message)
	}
}

// Функция для покупки удвоения монет за клик
async function buyDoubleUpgrade() {
	if (!token) return
	try {
		const response = await fetch(`${apiUrl}/upgrade/double/${username}`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
			},
		})
		if (!response.ok) {
			const data = await response.json()
			throw new Error(data.message || 'Ошибка при покупке улучшения')
		}
		const data = await response.json()
		alert(data.message)
		fetchUser() // Обновляем данные пользователя после покупки
	} catch (err) {
		alert(err.message)
	}
}

// Функции для регистрации и авторизации
async function register() {
	const usernameInput = document.getElementById('register-username').value
	const passwordInput = document.getElementById('register-password').value

	if (!usernameInput || !passwordInput) {
		alert('Пожалуйста, заполните все поля')
		return
	}

	try {
		const response = await fetch(`${apiUrl}/register`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				username: usernameInput,
				password: passwordInput,
			}),
		})

		if (!response.ok) {
			throw new Error('Ошибка при регистрации')
		}

		const data = await response.json()
		localStorage.setItem('token', data.token)
		username = usernameInput
		localStorage.setItem('username', username)
		alert('Регистрация успешна!')
		fetchUser()
	} catch (err) {
		alert(err.message)
	}
}

async function login() {
	const usernameInput = document.getElementById('login-username').value
	const passwordInput = document.getElementById('login-password').value

	if (!usernameInput || !passwordInput) {
		alert('Пожалуйста, заполните все поля')
		return
	}

	try {
		const response = await fetch(`${apiUrl}/login`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				username: usernameInput,
				password: passwordInput,
			}),
		})

		if (!response.ok) {
			const errorData = await response.json()
			console.error('Ошибка ответа:', errorData)
			throw new Error(errorData.message || 'Ошибка авторизации')
		}

		const data = await response.json()
		localStorage.setItem('token', data.token) // Сохраняем токен
		localStorage.setItem('username', usernameInput) // Сохраняем username
		username = usernameInput // Обновляем значение переменной username

		alert('Авторизация успешна!')
		fetchUser() // Функция для получения данных пользователя с сервера
	} catch (err) {
		alert(err.message)
	}
}

// Обработчики для кнопок
document.getElementById('coin').addEventListener('click', clickCoin)
document
	.getElementById('upgrade-click')
	.addEventListener('click', buyClickUpgrade)
document
	.getElementById('upgrade-double')
	.addEventListener('click', buyDoubleUpgrade)
document.getElementById('logout-btn').addEventListener('click', function () {
	localStorage.removeItem('username')
	localStorage.removeItem('token')
	location.reload()
})

// Обработчики для регистрации и логина
document.getElementById('register-btn').addEventListener('click', register)
document.getElementById('login-btn').addEventListener('click', login)

// Загрузка данных пользователя при входе
if (token) {
	fetchUser()
} else {
	alert('Пожалуйста, войдите в систему')
}
