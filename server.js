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

// 🚀 ระบบตั้งค่าสลับบอทและกลุ่มแบบไร้รอยต่อ 5 ระดับ!
const LINE_BOT_CONFIGS = [
    {
        token: "D9ExQrK4/2l62hPuPvnrxJnsNUoRogzAJTYQL8Tzr3U38WBPwJcUf26DceTDkG+qNSuJBVEI5E6d6z4qBcr5VOkwwN3wwk8IeWRc/agLjJzKTrG6S4Nren2ZBV4K5P9GeUg45AOA8VBFFY4hHfquXQdB04t89/1O/w1cDnyilFU=", 
        groupId: "Caf6de425fc6bacbf9afd71c27ffef7ea"
    },
    {
        token: "nLD8FyKUYl+DTlPrxjM5LfCok5WQB6e+2018rl2aVGXx1bcoZB7TVKu0Z3dUpvtqUvL/3ddpHbQT4mlPPa8r669UHktFYHxpiqrUIqdsfDRZPRy8wJPIowVmQZz6Hh21nB3uACfYu+aOi/vqBi+PgwdB04t89/1O/w1cDnyilFU=", 
        groupId: "C1687679de4aed716960fb107542f6aee"
    },
    {
        token: "Hn4AAbZi9vtZKzYbV6P388u8qazpjWzbRH9lR2E/CaCsMUWNBT2X2y0jMVileg6DZVju1jDkSkn51zOmF3HNRgpm3xEK8HL7Yme40y0zKPHAyRQwAaVj/w7n0601E+nJYRJu2AznmHILCTkQ9oqQkgdB04t89/1O/w1cDnyilFU=", 
        groupId: "C01cb95043d982c3f5a109508d9a87445"
    },
    {
        token: "A/YWNv3x+KgIMV4DKrToGZsW2r6fzscXk0mZTlONReLBwIxDQLVRdvHWQxHAuIl3UHtBAy7wW0SHgxUXEXEG5jq6Dmhj6rUN8/TwqZPuXD9S67ehPIkJeP99xzEqgWBc+3MPuXDZAgLHT8k8uiRCOwdB04t89/1O/w1cDnyilFU=", 
        groupId: "C8cd5795991cd8e7e9ffe4873061af450"
    },
    {
        token: "RiTyu58y5aqBgH5+yXINT+wY0eBOCM4ok1q4TfS/HyNjXmFpnG/ktmcbFobzhh2bcesQxUcCiOmV28gQmu26MyiahEOOc9N10gJK/sfTcNajXuLr0n6iOBBqS0lxL483q5oKQEFFf7IzfVwgx53R+AdB04t89/1O/w1cDnyilFU=", 
        groupId: "C264f89b5577d3246069b76bdcac39418"
    }
];

app.get('/', (req, res) => { res.status(200).send('ระบบหลังบ้านแซ่บลืมผัวทำงานปกติจ้า 🌶️🔥'); });
app.get('/api/ping', (req, res) => { res.status(200).send('OK'); });

async function sendLineMessageWithFallback(messageText, botIndex = 0) {
    if (botIndex >= LINE_BOT_CONFIGS.length) { throw new Error("🚨 โควตาเต็มหมดแล้วจ้า!"); }
    const currentBot = LINE_BOT_CONFIGS[botIndex];
    if (!currentBot.groupId || currentBot.groupId.includes("วาง_GROUP")) {
        return await sendLineMessageWithFallback(messageText, botIndex + 1);
    }
    try {
        await axios.post('https://api.line.me/v2/bot/message/push', {
            to: currentBot.groupId,
            messages: [{ type: 'text', text: messageText }]
        }, {
            headers: { 'Authorization': `Bearer ${currentBot.token}`, 'Content-Type': 'application/json' },
            timeout: 5000 // ⚡ ลด Timeout ลงเหลือ 5 วินาที เพื่อให้สลับบอทได้เร็วฟ้าผ่า ไม่ยืนเอ๋อรอโค้ดนาน
        });
    } catch (error) {
        const errorMsg = JSON.stringify(error.response ? error.response.data : {});
        if (errorMsg.includes("limit") || error.response?.status === 400 || error.response?.status === 429) {
            return await sendLineMessageWithFallback(messageText, botIndex + 1);
        } else {
            throw new Error(`LINE API พังที่กลุ่ม ${botIndex + 1}: ${error.message}`);
        }
    }
}

// 🛒 Route หลักสำหรับรับออเดอร์ (เวอร์ชันความเร็วสูง + คลีนคำว่าจานเกลี้ยง)
app.post('/api/order', async (req, res) => {
    try {
        const { customer, table, orderType, address, phone, orders, totalCost } = req.body;
        let formattedOrders = '';

        if (Array.isArray(orders)) {
            // ⚡ ใช้ลูปความเร็วสูงในการจัดเอกสารออเดอร์
            const itemsLog = [];
            for (let i = 0; i < orders.length; i++) {
                const item = orders[i];
                if (!item) continue;

                // 🧼 ซูเปอร์คลีน: ล้างคำว่า "จาน" ทุกรูปแบบ ไม่ว่าจะติดกับสระ ตัวเลข หรือเว้นวรรค
                let name = String(item.name || '')
                    .replace(/จาน/g, '')
                    .replace(/\s+/g, ' ')
                    .trim();

                let qty = item.quantity || item.qty || 1;
                let spicyText = item.spicy ? ` (${String(item.spicy).trim()})` : '';
                
                // ดักตรวจสิทธิ์เบียร์สิงห์
                const nameLower = name.toLowerCase();
                if (nameLower.includes("เบียร์สิงห์")) {
                    if (nameLower.includes("โปร") || spicyText.includes("โปร") || Number(item.price) === 240) {
                        name = "เบียร์สิงห์ (โปร)";
                    } else {
                        name = "เบียร์สิงห์ (ขวด)";
                    }
                }

                // คำนวณราคาด่วน
                let price = item.price || 0;
                let totalPrice = Number(price) * Number(qty);
                
                // ✨ ผลลัพธ์สุดท้ายจะถูกตัดคำว่า "จาน" ออกแบบถอนรากถอนโคน
                itemsLog.push(`• ${name}${spicyText} x ${qty}\nราคา ${totalPrice} บาท`);
            }
            formattedOrders = itemsLog.join('\n\n');
        } else if (typeof orders === 'string') {
            // เผื่อหน้าบ้านส่งหลุดมาเป็นสตริง ยัดแทรกตัวล้างคำว่าจานแบบละเอียดลงไปตรงนี้ด้วย
            formattedOrders = orders.replace(/จาน/g, '').replace(/\s*x\s*\d+\s*/g, (match) => match.trim() + ' ').trim();
        } else {
            formattedOrders = 'ไม่มีรายการอาหาร';
        }

        // 🚚 จัดเตรียมรูปแบบการจัดส่ง
        let deliveryInfo = '';
        if (orderType === "จัดส่ง" || String(table).includes('จัดส่ง')) {
            deliveryInfo = `🚚 รูปแบบ: จัดส่งถึงบ้าน (เดลิเวอรี่)\n📞 เบอร์โทร: ${phone || '-'}\n📍 ที่อยู่: ${address || '-'}`;
        } else if (orderType === "ห่อกลับบ้าน" || String(table).includes('ห่อกลับบ้าน')) {
            deliveryInfo = `🛍️ รูปแบบ: ห่อกลับบ้าน`;
        } else {
            const tableNum = String(table || '').replace(/โต๊ะที่|โต๊ะ/g, '').trim();
            deliveryInfo = `🍽️ รูปแบบ: ทานที่ร้าน (โต๊ะ: ${tableNum || '-'})`;
        }

        // 📝 มัดรวมข้อความส่งเข้า LINE บอท
        const messageText = `📥 ออเดอร์ใหม่เข้าแล้วจ้า! 🔥🌶️\n\n` +
                            `${deliveryInfo}\n` +
                            `👤 ลูกค้า: คุณ ${customer}\n\n` +
                            `📝 [ รายการอาหาร ]\n` +
                            `${formattedOrders}\n\n` +
                            `💰 ยอดสุทธิรวม: ${totalCost} บาท\n` +
                            `================🔥`;

        // สั่งยิงข้อความทันทีด้วยฟังก์ชันหน่วงเวลาน้อยลง
        await sendLineMessageWithFallback(messageText, 0);
        res.status(200).json({ status: 'success', message: 'ส่งออเดอร์สำเร็จ' });

    } catch (error) {
        console.error('❌ Main Server Error:', error.message);
        if (!res.headersSent) { res.status(500).json({ status: 'error', message: 'เกิดข้อผิดพลาด' }); }
    }
});

app.post('/callback', (req, res) => { res.sendStatus(200); });
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => { console.log(`🚀 เซิร์ฟเวอร์เปิดใช้งานสำเร็จที่พอร์ต: ${PORT}`); });