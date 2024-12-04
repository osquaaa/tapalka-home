let username = localStorage.getItem('username') || 'guest (без аккаунта)'
let token = localStorage.getItem('token')
let score = 0
let coins = 0
let coinsPerClick = 1
let multiplier = 1

const apiUrl = 'http://localhost:10000' // Ваш адрес на Render

// Обновление интерфейса
function updateUI() {
	const registerForm = document.getElementById('register-form')
	const loginForm = document.getElementById('login-form')
	const logoutBtn = document.getElementById('logout-btn')
	const greeting = document.getElementById('greeting')
	const scoreElement = document.getElementById('score')
	const coinsElement = document.getElementById('coins')
	document.getElementById('upgrade-click').textContent = `+1 К КЛИКУ (${
		coinsPerClick * 100
	} монет)`
	document.getElementById('upgrade-double').textContent = `ДАБЛ КЛИК (${
		multiplier * 10000
	} монет)`

	if (token) {
		registerForm.style.display = 'none'
		loginForm.style.display = 'none'
		logoutBtn.style.display = 'block'
		greeting.textContent = `Привет, ${username}`
	} else {
		registerForm.style.display = 'block'
		loginForm.style.display = 'block'
		logoutBtn.style.display = 'none'
		greeting.textContent = ''
	}

	scoreElement.textContent = `Очков: ${score}`
	coinsElement.textContent = `Монеты: ${coins}`
	if (username === 'Trofim') {
		document.getElementById('update-score-btn').style.display = 'block'
	} else {
		document.getElementById('update-score-btn').style.display = 'none'
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
		if (!response.ok) throw new Error('Пользователь не найден')

		const user = await response.json()
		score = user.score
		coins = user.coins
		coinsPerClick = user.coinsPerClick
		multiplier = user.multiplier

		updateUI()
	} catch (err) {
		alert(err.message)
	}
}
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
			prizeText = '(200 руб)'
		} else if (index === 2) {
			userElement.classList.add('top-user', 'bronze')
			prizeText = '(100 руб)'
		} else if (index === 3) {
			userElement.classList.add('top-user', 'bronze')
			prizeText = '(100 руб)'
		} else if (index === 4) {
			userElement.classList.add('top-user', 'bronze')
			prizeText = '(100 руб)'
		} else if (index === 5) {
			userElement.classList.add('top-user', 'bronze')
			prizeText = '(50 руб)'
		} else if (index === 6) {
			userElement.classList.add('top-user', 'bronze')
			prizeText = '(50 руб)'
		} else if (index === 20) {
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
// Функция для изменения счета другого пользователя (например, игрока с ником 'Trofim')
async function updateScoreForOtherUser() {
	if (!token) return

	// Проверяем, что авторизованный пользователь — это Trofim
	if (username !== 'Trofim') {
		alert('У вас нет прав для изменения счета других игроков')
		return
	}

	const targetUsername = prompt(
		'Введите имя пользователя, чей счет вы хотите изменить:'
	)
	const newScore = prompt('Введите новый счет для пользователя: ')

	if (!targetUsername || !newScore || isNaN(newScore)) {
		alert('Неверные данные')
		return
	}

	try {
		const response = await fetch(`${apiUrl}/update-score/${targetUsername}`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ score: parseInt(newScore) }),
		})

		if (!response.ok) {
			const errorData = await response.json()
			throw new Error(errorData.message || 'Ошибка при обновлении счета')
		}

		const data = await response.json()
		alert(data.message)
	} catch (err) {
		alert(err.message)
	}
}
document
	.getElementById('update-score-btn')
	.addEventListener('click', updateScoreForOtherUser)

// Обработчик для кнопки изменения счета другого пользователя

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
		if (!response.ok) throw new Error('Ошибка при обработке клика')

		const { score: updatedScore, coins: updatedCoins } = await response.json()
		score = updatedScore
		coins = updatedCoins
		updateUI()
	} catch (err) {
		showError(err.message)
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
		fetchUser()
	} catch (err) {
		alert(err.message)
	}
}

// Функция для покупки дабл клика
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
		fetchUser()
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
				role: 'user',
			}),
		})

		if (!response.ok) throw new Error('Ошибка при регистрации')

		const data = await response.json()
		localStorage.setItem('token', data.token)
		username = usernameInput
		localStorage.setItem('username', username)
		alert('Регистрация успешна!')
		location.reload()
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
			throw new Error(errorData.message || 'Ошибка авторизации')
		}

		const data = await response.json()
		localStorage.setItem('token', data.token)
		localStorage.setItem('username', usernameInput)
		username = usernameInput

		alert('Авторизация успешна!')
		location.reload()
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

