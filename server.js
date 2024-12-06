const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// Подключение к MongoDB Atlas
const mongoURI = 'mongodb+srv://myUser:denclassik@cluster0.1jt61.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

mongoose.set('strictQuery', false);
mongoose
    .connect(mongoURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => console.log('Подключение к базе данных успешно установлено'))
    .catch(err => {
        console.error('Ошибка подключения к базе данных:', err);
        process.exit(1);
    });

// Обработчик SIGINT (только один раз при запуске приложения)
process.on('SIGINT', () => {
    console.log('Отключение от базы данных...');
    mongoose.connection.close(() => {
        console.log('Соединение с базой данных закрыто');
        process.exit(0);
    });
});

// Определение схемы и модели пользователя
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// JWT секретный ключ
const SECRET_KEY = 'secretkey';

// Определение схемы и модели пользователя
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    score: { type: Number, default: 0 },
    coins: { type: Number, default: 0 },
    coinsPerClick: { type: Number, default: 1 },
    multiplier: { type: Number, default: 1 },
});

const User = mongoose.model('User', userSchema);

// Маршрут для главной страницы
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Регистрация пользователя
app.post('/register', async (req, res) => {
	const { username, password } = req.body;
	try {
		const existing = await User.findOne({ username });
		if (existing) return res.status(400).json({ message: 'Имя занято' });

		const hash = await bcrypt.hash(password, 10);
		const user = new User({ username, password: hash });
		await user.save();

		const token = jwt.sign({ id: user._id }, SECRET_KEY, { expiresIn: '3d' });
		res.json({ token });
	} catch (error) {
		res.status(500).json({ message: 'Ошибка регистрации' });
	}
});

// Авторизация пользователя
app.post('/login', async (req, res) => {
	const { username, password } = req.body;
	try {
		const user = await User.findOne({ username });
		if (!user) return res.status(404).json({ message: 'Пользователь не найден' });

		const valid = await bcrypt.compare(password, user.password);
		if (!valid) return res.status(401).json({ message: 'Неверный пароль' });

		const token = jwt.sign({ id: user._id }, SECRET_KEY, { expiresIn: '3d' });
		res.json({ token });
	} catch (error) {
		res.status(500).json({ message: 'Ошибка авторизации' });
	}
});

function authenticate(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Отсутствует токен' });
    }

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) {
            return res
                .status(401)
                .json({ message: 'Неверный или просроченный токен' });
        }
        req.userId = decoded.id;
        next();
    });
}

// Роут для получения данных пользователя
app.get('/user', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        res.json({
            username: user.username,
            score: user.score,
            coins: user.coins,
            coinsPerClick: user.coinsPerClick,
            multiplier: user.multiplier,
        });
    } catch (err) {
        res.status(500).json({ message: 'Ошибка получения данных пользователя' });
    }
});


// Роут для обработки кликов
app.post('/click', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        // Обновляем только монеты и счет
        user.score += user.coinsPerClick * user.multiplier;
        user.coins += user.coinsPerClick;

        await user.save();

        res.json({
            score: user.score,
            coins: user.coins,
        });
    } catch (err) {
        res.status(500).json({ message: 'Ошибка обработки клика' });
    }
});

// Роут для покупки улучшения дабл клика
app.post('/upgrade/double', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        const upgradePrice = user.multiplier * 10000;
        if (user.coins < upgradePrice) {
            return res
                .status(400)
                .json({ message: 'Недостаточно монет для покупки улучшения' });
        }

        user.coins -= upgradePrice;
        user.multiplier *= 2;
        await user.save();

        res.json({ message: 'Улучшение успешно куплено', user });
    } catch (err) {
        res.status(500).json({ message: 'Ошибка при покупке улучшения' });
    }
});


// Роут для покупки улучшения +1 к монетам за клик
app.post('/upgrade/click', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        const upgradePrice = user.coinsPerClick * 100;
        if (user.coins < upgradePrice) {
            return res
                .status(400)
                .json({ message: 'Недостаточно монет для покупки улучшения' });
        }

        user.coins -= upgradePrice;
        user.coinsPerClick += 1;
        await user.save();

        res.json({ message: 'Улучшение успешно куплено', user });
    } catch (err) {
        res.status(500).json({ message: 'Ошибка при покупке улучшения' });
    }
});


// Роут для получения топа пользователей (по убыванию счета)
app.get('/top-users', async (req, res) => {
    try {
        const topUsers = await User.find()
            .sort({ score: -1 })
            .limit(21)
            .select('username score'); // Выбираем только нужные поля

        res.json(topUsers);
    } catch (err) {
        res.status(500).json({ message: 'Ошибка при получении топа пользователей' });
    }
});


const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});
