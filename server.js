const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

// 🛠️ 1. ปรับ CORS ตัวเต็มเพื่อเคลียร์ทางให้เบราว์เซอร์ Android Chrome ยิงผ่านได้ฉลุยไม่มีบล็อก
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    credentials: true
}));

app.use(express.json());

const LINE_ACCESS_TOKEN = "D9ExQrK4/2l62hPuPvnrxJnsNUoRogzAJTYQL8Tzr3U38WBPwJcUf26DceTDkG+qNSuJBVEI5E6d6z4qBcr5VOkwwN3wwk8IeWRc/agLjJzKTrG6S4Nren2ZBV4K5P9GeUg45AOA8VBFFY4hHfquXQdB04t89/1O/w1cDnyilFU=";
const LINE_TARGET_GROUP_ID = "Caf6de425fc6bacbf9afd71c27ffef7ea";

// เพิ่ม Route พิเศษเอาไว้เช็กว่าหลังบ้านตื่นอยู่ไหม
app.get('/api/ping', (req, res) => {
    res.status(200).send('OK');
});

app.post('/api/order', async (req, res) => {
    try {
        const { customer, table, orders, totalCost, phone, address } = req.body;

        let formattedOrders = '';

// 📥 จัดการ รายการอาหาร + ระดับความเผ็ด (เวอร์ชันป้องกันราคาเป็น NaN)
        if (Array.isArray(orders)) {
            formattedOrders = orders.map(item => {
                // เช็กให้ชัวร์ว่ารองรับทั้ง item.quantity และ item.qty
                const qty = item.quantity || item.qty || 1;
                const price = item.price || 0;
                const spicy = item.spicy || 'เผ็ดกลาง';
                
                const totalPrice = Number(price) * Number(qty);
                // ถ้าคำนวณแล้วพัง ให้ใช้ราคา 0 หรือตัวเลขดิบแทน ไม่ปล่อยให้เป็น NaN ออกไป
                const displayPrice = isNaN(totalPrice) ? 0 : totalPrice; 
                
                return `• ${item.name} (${spicy}) x ${qty} จาน\nราคา ${displayPrice} บาท`;
            }).join('\n\n'); 
        } else {
            formattedOrders = orders || 'ไม่มีรายการอาหาร';
        }

        // 📝 จัดการประเภทการเสิร์ฟ / ข้อมูลจัดส่ง
        let deliveryInfo = '';
        const orderType = table ? table.toString().trim() : '';

        if (orderType.includes('จัดส่งถึงบ้าน') || orderType.includes('เดลิเวอรี่')) {
            deliveryInfo = `🚚 รูปแบบ: จัดส่งถึงบ้าน (เดลิเวอรี่)\n` +
                           `📞 เบอร์โทร: ${phone || '-'}\n` +
                           `📍 ที่อยู่: ${address || '-'}`;
        } else if (orderType.includes('ห่อกลับบ้าน')) {
            deliveryInfo = `🛍️ รูปแบบ: ห่อกลับบ้าน`;
        } else {
            const tableNum = orderType.replace(/โต๊ะที่|โต๊ะ/g, '').trim();
            deliveryInfo = `🍽️ รูปแบบ: ทานที่ร้าน (โต๊ะ: ${tableNum || '-'})`;
        }

        // 🌟 ข้อความอาร์ตเวิร์กแจ้งเตือนเข้ากลุ่ม LINE
        const messageText = `📥 ออเดอร์ใหม่เข้าแล้วจ้า! 🔥🌶️\n\n` +
                            `${deliveryInfo}\n` +
                            `👤 ลูกค้า: คุณ ${customer}\n\n` +
                            `📝 [ รายการอาหาร ]\n` +
                            `${formattedOrders}\n\n` +
                            `💰 ยอดสุทธิรวม: ${totalCost} บาท\n` +
                            `================🔥`;

        // 🚀 2. [แก้ปัญหาแอนดรอยด์ค้างหมุนนาน]: คืนสถานะความสำเร็จกลับไปให้โทรศัพท์ลูกค้าทันที!
        res.status(200).json({ status: 'success', message: 'ส่งออเดอร์สำเร็จ' });

        // 🤫 3. ปล่อยให้เซิร์ฟเวอร์หลังบ้านแอบยิงข้อมูลไปที่ LINE เองเบื้องหลัง โทรศัพท์ลูกค้าจะได้ไม่ต้องรอคิว
        axios.post('https://api.line.me/v2/bot/message/push', {
            to: LINE_TARGET_GROUP_ID,
            messages: [{ type: 'text', text: messageText }]
        }, {
            headers: {
                'Authorization': `Bearer ${LINE_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            }
        }).catch(err => {
            console.error('❌ LINE API Error (Background):', err.response ? err.response.data : err.message);
        });

    } catch (error) {
        console.error('❌ Main Server Error:', error.message);
        if (!res.headersSent) {
            res.status(500).json({ status: 'error', message: 'เกิดข้อผิดพลาดในการส่งออเดอร์' });
        }
    }
});

app.post('/callback', (req, res) => { res.sendStatus(200); });

// ปรับพอร์ตให้เข้ากับระบบของ Render (Render จะสุ่มพอร์ตมาให้ผ่าน process.env.PORT)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log(`🚀 Server running on port ${PORT}`); });