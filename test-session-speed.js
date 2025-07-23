import axios from 'axios';

const SERVER_URL = 'http://localhost:5000';

// Генерируем случайные данные для теста
function generateTestData() {
  const timestamp = Date.now();
  return {
    email: `test_${timestamp}@example.com`,
    password: 'testpassword123',
    firstName: 'Test',
    lastName: 'User',
    username: `testuser_${timestamp}`,
    phone: `+7999${timestamp.toString().slice(-7)}`,
    address: 'Test Address',
    verificationToken: 'test_token_' + timestamp
  };
}

async function testRegistrationSpeed() {
  console.log('🚀 Тестирование скорости регистрации с оптимизированной сессией...\n');
  
  const testData = generateTestData();
  
  try {
    // 1. Запрашиваем верификацию телефона (это сохранит данные в pending_registrations)
    console.log('1. Запрашиваем верификацию телефона...');
    const saveResponse = await axios.post(`${SERVER_URL}/api/auth/request-phone-verification`, {
      phone: testData.phone,
      userData: {
        email: testData.email,
        password: testData.password,
        firstName: testData.firstName,
        lastName: testData.lastName,
        username: testData.username,
        address: testData.address,
        socialType: 'Instagram',
        socialUser: '@testuser'
      },
      verificationToken: testData.verificationToken
    });
    
    console.log('✅ Данные сохранены, верификация запрошена');
    
    // 2. Подтверждаем телефон (имитируем подтверждение через Telegram)
    console.log('2. Подтверждаем телефон...');
    const confirmResponse = await axios.post(`${SERVER_URL}/api/telegram/verify-phone`, {
      phone: testData.phone,
      verificationToken: testData.verificationToken
    });
    
    console.log('✅ Телефон подтвержден');
    
    // 3. Тестируем быструю проверку верификации (завершение регистрации)
    console.log('\n3. Тестируем быстрое создание сессии...');
    const startTime = Date.now();
    
    const verifyResponse = await axios.post(`${SERVER_URL}/api/auth/check-phone-verification`, {
      phone: testData.phone,
      verificationToken: testData.verificationToken
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`⚡ Время создания сессии: ${duration}ms`);
    
    if (verifyResponse.data.verified && verifyResponse.data.autoLogin) {
      console.log('✅ Быстрая регистрация с автологином успешна!');
      console.log(`👤 Пользователь: ${verifyResponse.data.user.email}`);
      console.log(`🏃‍♂️ Скорость: ${duration < 500 ? 'ОТЛИЧНО' : duration < 1000 ? 'ХОРОШО' : 'МЕДЛЕННО'}`);
    } else {
      console.log('❌ Ошибка при регистрации:', verifyResponse.data);
    }
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.response?.data || error.message);
  }
}

// Тест нескольких регистраций подряд
async function testMultipleRegistrations() {
  console.log('\n📊 Тестирование множественных регистраций...\n');
  
  const results = [];
  const testCount = 5;
  
  for (let i = 1; i <= testCount; i++) {
    console.log(`Тест ${i}/${testCount}:`);
    
    const testData = generateTestData();
    const startTime = Date.now();
    
    try {
      // Запрашиваем верификацию
      await axios.post(`${SERVER_URL}/api/auth/request-phone-verification`, {
        phone: testData.phone,
        userData: {
          email: testData.email,
          password: testData.password,
          firstName: testData.firstName,
          lastName: testData.lastName,
          username: testData.username,
          address: testData.address,
          socialType: 'Instagram',
          socialUser: '@testuser'
        },
        verificationToken: testData.verificationToken
      });
      
      // Подтверждаем телефон
      await axios.post(`${SERVER_URL}/api/telegram/verify-phone`, {
        phone: testData.phone,
        verificationToken: testData.verificationToken
      });
      
      // Завершаем регистрацию
      const verifyResponse = await axios.post(`${SERVER_URL}/api/auth/check-phone-verification`, {
        phone: testData.phone,
        verificationToken: testData.verificationToken
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      results.push(duration);
      console.log(`  ⚡ ${duration}ms - ${duration < 500 ? '✅' : '⚠️'}`);
      
    } catch (error) {
      console.log(`  ❌ Ошибка: ${error.response?.data?.error || error.message}`);
    }
    
    // Небольшая пауза между тестами
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  if (results.length > 0) {
    const avgTime = results.reduce((a, b) => a + b, 0) / results.length;
    const minTime = Math.min(...results);
    const maxTime = Math.max(...results);
    
    console.log('\n📈 Статистика:');
    console.log(`   Среднее время: ${avgTime.toFixed(0)}ms`);
    console.log(`   Минимальное: ${minTime}ms`);
    console.log(`   Максимальное: ${maxTime}ms`);
    console.log(`   Оценка: ${avgTime < 500 ? '🚀 ОТЛИЧНО' : avgTime < 1000 ? '✅ ХОРОШО' : '⚠️ ТРЕБУЕТ ОПТИМИЗАЦИИ'}`);
  }
}

// Запускаем тесты
async function runTests() {
  console.log('🔥 ТЕСТ СКОРОСТИ СОЗДАНИЯ СЕССИИ ПРИ РЕГИСТРАЦИИ\n');
  
  try {
    // Проверяем доступность сервера
    await axios.get(`${SERVER_URL}/api/products`);
    console.log('✅ Сервер доступен\n');
  } catch (error) {
    console.log('❌ Сервер недоступен. Убедитесь, что сервер запущен на порту 5000');
    return;
  }
  
  await testRegistrationSpeed();
  await testMultipleRegistrations();
  
  console.log('\n🎉 Тестирование завершено!');
}

runTests().catch(console.error); 