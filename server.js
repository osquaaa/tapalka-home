const express = require('express')

const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const cors = require('cors')

// Подключение к MongoDB Atlas (замените ваш URI)
const mongoURI =
	'mongodb+srv://myUser:denclassik@cluster0.1jt61.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'

mongoose
	.connect(mongoURI, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	})
	.then(() => console.log('Подключение к базе данных успешно установлено'))
	.catch(err => console.error('Ошибка подключения к базе данных:', err))

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

const app = express()
const corsOptions = {
	origin: '*',
	methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
	allowedHeaders: ['Content-Type', 'Authorization'],
}
app.use(cors(corsOptions))

app.options('*', cors()) // Обработка предзапросов
app.use(express.json())
app.use(express.static(__dirname))

const SECRET_KEY = 'secretkey' // Ваш секретный ключ для JWT

// Регистрация пользователя
app.post('/register', async (req, res) => {
	const { username, password } = req.body

	// Проверяем, существует ли уже пользователь с таким именем
	const existingUser = await User.findOne({ username })
	if (existingUser) {
		return res
			.status(400)
			.json({ message: 'Пользователь с таким именем уже существует' })
	}

	// Хешируем пароль
	const hashedPassword = await bcrypt.hash(password, 10)

	// Создаем нового пользователя
	const newUser = new User({ username, password: hashedPassword })
	await newUser.save()

	// Создаем JWT
	const token = jwt.sign({ id: newUser._id }, SECRET_KEY, { expiresIn: '1h' })

	res.json({ token })
})

// Авторизация пользователя
app.post('/login', async (req, res) => {
	const { username, password } = req.body

	// Находим пользователя по имени
	const user = await User.findOne({ username })
	if (!user) {
		return res.status(400).json({ message: 'Пользователь не найден' })
	}

	// Сравниваем пароли
	const isPasswordValid = await bcrypt.compare(password, user.password)
	if (!isPasswordValid) {
		return res.status(400).json({ message: 'Неверный пароль' })
	}

	// Создаем JWT
	const token = jwt.sign({ id: user._id }, 'secretkey', { expiresIn: '1h' })

	res.json({ token })
})

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
	const { username } = req.params
	let user = await User.findOne({ username })

	if (!user) {
		user = new User({ username })
		await user.save()
	}

	res.json(user)
})

// Роут для обработки кликов
app.post('/click/:username', authenticate, async (req, res) => {
	const { username } = req.params
	const user = await User.findOne({ username })

	if (!user) {
		return res.status(404).json({ message: 'Пользователь не найден' })
	}

	user.score += user.coinsPerClick * user.multiplier
	user.coins += user.coinsPerClick
	await user.save()

	res.json(user)
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

// Динамический порт, предоставленный Render
const http = require("http");
const server = http.createServer((req, res) => {
  res.end("Hello from server!");
});

const port = process.env.PORT || 3000; // Используем порт от Vercel
server.listen(port, () => console.log(`Server running on port ${port}`));