const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    credentials: true
}));
app.use(express.json());

const LINE_BOT_CONFIGS = [
    {
        token: "RiTyu58y5aqBgH5+yXINT+wY0eBOCM4ok1q4TfS/HyNjXmFpnG/ktmcbFobzhh2bcesQxUcCiOmV28gQmu26MyiahEOOc9N10gJK/sfTcNajXuLr0n6iOBBqS0lxL483q5oKQEFFf7IzfVwgx53R+AdB04t89/1O/w1cDnyilFU=", 
        groupId: "วาง_GROUP_ID_ของกลุ่มใหม่ที่_2_ตรงนี้" 
    }
];

app.get('/', (req, res) => {
    res.status(200).send('ระบบหลังบ้านแซ่บลืมผัวทำงานปกติจ้า 🌶️🔥');
});

app.get('/api/ping', (req, res) => {
    res.status(200).send('OK');
});

// 🔍 บรรทัดนี้จะดักจับสิ่งทีมาจาก LINE Webhook แล้วพ่น ID กลุ่มลงหน้า Logs ชัดๆ เลยครับ
app.post('/callback', (req, res) => {
    try {
        const events = req.body.events;
        if (events && events.length > 0) {
            events.forEach(event => {
                // ดึงรหัสจาก source ไม่ว่าจะเป็น group หรือ room
                if (event.source && event.source.groupId) {
                    console.log('====================================');
                    console.log('📌 พบ GROUP ID ของพี่โอ๊ตแล้วครับ:');
                    console.log(`🆔 รหัสกลุ่มคือ: ${event.source.groupId}`);
                    console.log('====================================');
                }
            });
        }
    } catch (err) {
        console.error('Error parsing webhook:', err.message);
    }
    res.sendStatus(200);
});

async function sendLineMessageWithFallback(messageText, botIndex = 0) {
    if (botIndex >= LINE_BOT_CONFIGS.length) {
        throw new Error("🚨 โควตาฟรีของบอท LINE ทุกกลุ่มเต็มหมดแล้วจ้า!");
    }

    const currentBot = LINE_BOT_CONFIGS[botIndex];

    if (!currentBot.groupId || currentBot.groupId.includes("วาง_GROUP")) {
        console.warn(`⚠️ บอทกลุ่มที่ ${botIndex + 1} ยังไม่ได้ใส่รหัสกลุ่ม ข้ามไปสลับตัวถัดไป...`);
        return await sendLineMessageWithFallback(messageText, botIndex + 1);
    }

    try {
        await axios.post('https://api.line.me/v2/bot/message/push', {
            to: currentBot.groupId,
            messages: [{ type: 'text', text: messageText }]
        }, {
            headers: {
                'Authorization': `Bearer ${currentBot.token}`,
                'Content-Type': 'application/json'
            },
            timeout: 8000
        });
        console.log(`✅ ส่งออเดอร์เข้ากลุ่มสำเร็จด้วย บอทกลุ่มที่ ${botIndex + 1}`);
    } catch (error) {
        const errorData = error.response ? error.response.data : {};
        const errorMsg = JSON.stringify(errorData);
        
        if (errorMsg.includes("limit") || error.response?.status === 400 || error.response?.status === 429) {
            return await sendLineMessageWithFallback(messageText, botIndex + 1);
        } else {
            throw new Error(`LINE API พังที่กลุ่ม ${botIndex + 1}: ${error.message}`);
        }
    }
}

app.post('/api/order', async (req, res) => {
    try {
        const { customer, table, orders, totalCost, phone, address } = req.body;
        let formattedOrders = '';

        if (Array.isArray(orders)) {
            formattedOrders = orders.map(item => {
                const qty = item.quantity || item.qty || 1;
                const price = item.price || 0;
                const spicy = item.spicy || 'เผ็ดกลาง';
                const totalPrice = Number(price) * Number(qty);
                return `• ${item.name} (${spicy}) x ${qty} จาน\nราคา ${isNaN(totalPrice) ? 0 : totalPrice} บาท`;
            }).join('\n\n'); 
        } else {
            formattedOrders = orders || 'ไม่มีรายการอาหาร';
        }

        let deliveryInfo = '';
        const orderType = table ? table.toString().trim() : '';

        if (orderType.includes('จัดส่งถึงบ้าน') || orderType.includes('เดลิเวอรี่')) {
            deliveryInfo = `🚚 รูปแบบ: จัดส่งถึงบ้าน (เดลิเวอรี่)\n📞 เบอร์โทร: ${phone || '-'}\n📍 ที่อยู่: ${address || '-'}`;
        } else if (orderType.includes('ห่อกลับบ้าน')) {
            deliveryInfo = `🛍️ รูปแบบ: ห่อกลับบ้าน`;
        } else {
            const tableNum = orderType.replace(/โต๊ะที่|โต๊ะ/g, '').trim();
            deliveryInfo = `🍽️ รูปแบบ: ทานที่ร้าน (โต๊ะ: ${tableNum || '-'})`;
        }

        const messageText = `📥 ออเดอร์ใหม่เข้าแล้วจ้า! 🔥🌶️\n\n` +
                            `${deliveryInfo}\n` +
                            `👤 ลูกค้า: คุณ ${customer}\n\n` +
                            `📝 [ รายการอาหาร ]\n` +
                            `${formattedOrders}\n\n` +
                            `💰 ยอดสุทธิรวม: ${totalCost} บาท\n` +
                            `================🔥`;

        await sendLineMessageWithFallback(messageText, 0);
        res.status(200).json({ status: 'success', message: 'ส่งออเดอร์สำเร็จ' });

    } catch (error) {
        console.error('❌ Main Server Error:', error.message);
        if (!res.headersSent) {
            res.status(200).json({ status: 'success', message: 'รับออเดอร์เข้าระบบเรียบร้อยแล้ว' });
        }
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => { 
    console.log(`🚀 เซิร์ฟเวอร์เปิดใช้งานสำเร็จที่พอร์ต: ${PORT}`); 
});