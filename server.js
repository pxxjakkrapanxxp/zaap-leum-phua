const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

// เปิดรับส่งข้อมูลข้ามโดเมนอย่างสมบูรณ์
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    credentials: true
}));
app.use(express.json());

// 🚀 1. คู่ตั้งค่าบอทและกลุ่ม (อย่าลืมทยอยเอา ID กลุ่มใหม่มาเปลี่ยนในช่อง groupId น้า)
const LINE_BOT_CONFIGS = [
    {
        token: "nLD8FyKUYl+DTlPrxjM5LfCok5WQB6e+2018rl2aVGXx1bcoZB7TVKu0Z3dUpvtqUvL/3ddpHbQT4mlPPa8r669UHktFYHxpiqrUIqdsfDRZPRy8wJPIowVmQZz6Hh21nB3uACfYu+aOi/vqBi+PgwdB04t89/1O/w1cDnyilFU=", 
        groupId: "วาง_GROUP_ID_ของกลุ่มใหม่ที่_2_ตรงนี้" // 📦 กลุ่มที่ 2
    }
];

// หน้าแรกป้องกันเซิร์ฟเวอร์เงียบ
app.get('/', (req, res) => {
    res.status(200).send('ระบบหลังบ้านแซ่บลืมผัวทำงานปกติจ้า 🌶️🔥');
});

app.get('/api/ping', (req, res) => {
    res.status(200).send('OK');
});

// 🔄 ฟังก์ชันสลับกลุ่มอัตโนมัติ
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
            console.warn(`⚠️ บอทกลุ่มที่ ${botIndex + 1} ส่งไม่ได้ กำลังโยนไป บอทกลุ่มที่ ${botIndex + 2}...`);
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

app.post('/callback', (req, res) => { res.sendStatus(200); });

// 🛠️ แก้จุดเปิดพอร์ตใหม่ให้อ่านค่าพอร์ตของ Render ได้แม่นยำ 100%
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => { 
    console.log(`🚀 เซิร์ฟเวอร์เปิดใช้งานสำเร็จที่พอร์ต: ${PORT}`); 
});