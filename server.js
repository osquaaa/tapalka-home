const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const cors = require('cors')
const path = require('path')

// Подключение к MongoDB Atlas (замените ваш URI)
const mongoURI =
	'mongodb+srv://myUser:denclassik@cluster0.1jt61.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'

mongoose.set('strictQuery', false) // Убирает лишние предупреждения
mongoose
	.connect(mongoURI, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	})
	.then(() => console.log('Подключение к базе данных успешно установлено'))
	.catch(err => {
		console.error('Ошибка подключения к базе данных:', err)
		process.exit(1) // Завершаем процесс при ошибке подключения
	})

// Определение схемы и модели пользователя
const app = express()

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.static(__dirname))

// JWT секретный ключ
const SECRET_KEY = 'secretkey'

// Определение схемы и модели пользователя
const userSchema = new mongoose.Schema({
	username: { type: String, required: true, unique: true },
	password: { type: String, required: true },
	score: { type: Number, default: 0 },
	coins: { type: Number, default: 0 },
	coinsPerClick: { type: Number, default: 1 },
	multiplier: { type: Number, default: 1 },
})

const User = mongoose.model('User', userSchema)

// Маршрут для главной страницы
app.get('/', (req, res) => {
	res.sendFile(path.join(__dirname, 'index.html'))
})

// Регистрация пользователя
app.post('/register', async (req, res) => {
	try {
		const { username, password } = req.body

		const existingUser = await User.findOne({ username })
		if (existingUser) {
			return res
				.status(400)
				.json({ message: 'Пользователь с таким именем уже существует' })
		}

		const hashedPassword = await bcrypt.hash(password, 10)
		const newUser = new User({ username, password: hashedPassword })
		await newUser.save()

		const token = jwt.sign({ id: newUser._id }, SECRET_KEY, { expiresIn: '3d' })
		res.json({ token })
	} catch (error) {
		console.error('Ошибка при регистрации:', error)
		res.status(500).json({ message: 'Внутренняя ошибка сервера' })
	}
})

// Авторизация пользователя
app.post('/login', async (req, res) => {
	try {
		const { username, password } = req.body

		const user = await User.findOne({ username })
		if (!user) {
			return res.status(400).json({ message: 'Пользователь не найден' })
		}

		const isPasswordValid = await bcrypt.compare(password, user.password)
		if (!isPasswordValid) {
			return res.status(400).json({ message: 'Неверный пароль' })
		}

		const token = jwt.sign({ id: user._id }, SECRET_KEY, { expiresIn: '1h' })
		res.json({ token })
	} catch (error) {
		console.error('Ошибка при авторизации:', error)
		res.status(500).json({ message: 'Внутренняя ошибка сервера' })
	}
})

// Роут для получения списка всех пользователей (только для админа)

// Роут для удаления пользователя (только для админа)

function authenticate(req, res, next) {
	const token = req.headers.authorization?.split(' ')[1]
	if (!token) {
		return res.status(401).json({ message: 'Отсутствует токен' })
	}

	jwt.verify(token, SECRET_KEY, (err, decoded) => {
		if (err) {
			return res
				.status(401)
				.json({ message: 'Неверный или просроченный токен' })
		}
		req.userId = decoded.id
		next()
	})
}

// Роут для получения данных пользователя
app.get('/user/:username', authenticate, async (req, res) => {
	try {
		const { username } = req.params
		let user = await User.findOne({ username })

		if (!user) {
			user = new User({ username })
			await user.save()
		}

		res.json(user)
	} catch (error) {
		console.error('Ошибка получения данных пользователя:', error)
		res.status(500).json({ message: 'Внутренняя ошибка сервера' })
	}
})

// Роут для обработки кликов
app.post('/click/:username', authenticate, async (req, res) => {
	const { username } = req.params
	const user = await User.findOne({ username })

	if (!user) {
		return res.status(404).json({ message: 'Пользователь не найден' })
	}
	process.on('SIGINT', () => {
		console.log('Отключение от базы данных...')
		mongoose.connection.close(() => {
			console.log('Соединение с базой данных закрыто')
			process.exit(0)
		})
	})
	user.score += user.coinsPerClick * user.multiplier
	user.coins += user.coinsPerClick
	await user.save()

	res.json(user)
})

app.post('/upgrade/double/:username', async (req, res) => {
	const { username } = req.params
	const user = await User.findOne({ username })

	if (!user) {
		return res.status(404).json({ message: 'Пользователь не найден' })
	}

	const upgradePrice = user.multiplier * 10000
	if (user.coins < upgradePrice) {
		return res
			.status(400)
			.json({ message: 'Недостаточно монет для покупки улучшения' })
	}

	user.coins -= upgradePrice
	user.multiplier *= 2
	await user.save()

	res.json({ message: 'Улучшение успешно куплено', user })
})
// Роут для покупки улучшения +1 к монетам за клик
app.post('/upgrade/click/:username', authenticate, async (req, res) => {
	const { username } = req.params
	const user = await User.findOne({ username })

	if (!user) {
		return res.status(404).json({ message: 'Пользователь не найден' })
	}

	const upgradePrice = user.coinsPerClick * 100
	if (user.coins < upgradePrice) {
		return res
			.status(400)
			.json({ message: 'Недостаточно монет для покупки улучшения' })
	}

	user.coins -= upgradePrice
	user.coinsPerClick += 1
	await user.save()

	res.json({ message: 'Улучшение успешно куплено', user })
})

// Роут для получения топа пользователей (по убыванию счета)
app.get('/top-users', async (req, res) => {
	try {
		const topUsers = await User.find()
			.sort({ score: -1 }) // Сортировка по убыванию счета
			.limit(10) // Ограничение до 10 пользователей

		res.json(topUsers)
	} catch (err) {
		res.status(500).json({ message: 'Ошибка при получении топа пользователей' })
	}
})

const PORT = process.env.PORT || 10000
app.listen(PORT, () => {
	console.log(`Сервер запущен на порту ${PORT}`)
})
