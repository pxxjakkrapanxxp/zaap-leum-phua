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

// 🚀 ระบบตั้งค่าสลับบอทและกลุ่มแบบไร้รอยต่อ 5 ระดับ! (บอทประจำคู่กลุ่มตัวเอง)
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

// เพิ่ม Route พิเศษเอาไว้เช็กว่าหลังบ้านตื่นอยู่ไหม
app.get('/api/ping', (req, res) => {
    res.status(200).send('OK');
});

// 🔄 ฟังก์ชันอัจฉริยะ: วนลูปสลับคู่บอทและกลุ่มคู่กันไปเรื่อยๆ หากตรวจพบว่าโควตา 300 ข้อความเต็ม
async function sendLineMessageWithFallback(messageText, configIndex = 0) {
    if (configIndex >= LINE_BOT_CONFIGS.length) {
        throw new Error("🚨 โควตาฟรีของบอท LINE ทุกกลุ่มเต็มหมดแล้วจ้า!");
    }

    const currentBot = LINE_BOT_CONFIGS[configIndex];

    try {
        await axios.post('https://api.line.me/v2/bot/message/push', {
            to: currentBot.groupId,
            messages: [{ type: 'text', text: messageText }]
        }, {
            headers: {
                'Authorization': `Bearer ${currentBot.token}`,
                'Content-Type': 'application/json'
            },
            timeout: 8000 // ล็อกเวลาไว้ 8 วินาทีป้องกันเบราว์เซอร์ค้างหมุนนาน
        });
        console.log(`✅ ส่งออเดอร์เข้ากลุ่มสำเร็จด้วย บอทกลุ่มที่ ${configIndex + 1}`);
    } catch (error) {
        const errorData = error.response ? error.response.data : {};
        const errorMsg = JSON.stringify(errorData);
        
        // 🛠️ ดักจับ Error: ถ้าข้อความเต็ม 300 (limit) หรือส่งไม่ผ่าน ให้กระโดดสลับไปใช้ บอท+กลุ่ม ถัดไปทันที
        if (errorMsg.includes("limit") || error.response?.status === 400 || error.response?.status === 429) {
            console.warn(`⚠️ บอทกลุ่มที่ ${configIndex + 1} เต็มหรือส่งไม่ได้ กำลังสลับไปใช้บอทกลุ่มที่ ${configIndex + 2}...`);
            return await sendLineMessageWithFallback(messageText, configIndex + 1);
        } else {
            // ถ้าพังด้วยสาเหตุอื่น ให้โยน Error ออกไป
            throw new Error(`LINE API พังที่บอทกลุ่มที่ ${configIndex + 1}: ${error.message}`);
        }
    }
}

// 🛒 Route หลักสำหรับรับออเดอร์ 
app.post('/api/order', async (req, res) => {
    try {
        const { customer, table, orderType, address, phone, orders, totalCost } = req.body;
        let formattedOrders = '';

        if (Array.isArray(orders)) {
            const itemsLog = [];
            for (let i = 0; i < orders.length; i++) {
                const item = orders[i];
                if (!item) continue;

                // 🧼 ซูเปอร์คลีนคำว่าจานออก
                let name = String(item.name || '').replace(/จาน/g, '').replace(/\s+/g, ' ').trim();
                let qty = item.quantity || item.qty || 1;
                let price = Number(item.price || 0);
                let totalPrice = price * Number(qty);
                
                let spicyText = item.spicy ? ` (${String(item.spicy).trim()})` : '';
                const nameLower = name.toLowerCase();

                // 🎯 [หมวดเครื่องดื่ม] คัดกรองด้วยราคา ล้างชื่อหลอน
                if (nameLower.includes("เบียร์สิงห์")) {
                    spicyText = ''; 
                    if (price === 240) {
                        name = "เบียร์สิงห์ (โปร)";
                    } else {
                        name = "เบียร์สิงห์ (ขวด)";
                    }
                } 
                // ดักจับและจัดรูปชื่อเบียร์ช้าง
                else if (nameLower.includes("เบียร์ช้าง")) {
                    spicyText = ''; 
                    if (price === 210) {
                        name = "เบียร์ช้าง (โปร)";
                    } else {
                        name = "เบียร์ช้าง (ขวด)";
                    }
                } 
                // ดักจับและจัดรูปชื่อแสงโสม
                else if (nameLower.includes("แสงโสม")) {
                    spicyText = '';
                    if (price === 200) {
                        name = "แสงโสม (แบน)";
                    } else {
                        name = "แสงโสม (กลม)";
                    }
                }

                // สกัดคำว่า (ธรรมดา) เผื่อตกค้างในกลุ่มเครื่องดื่มอื่นๆ
                if (nameLower.includes("เบียร์") || nameLower.includes("น้ำ") || nameLower.includes("โซดา") || nameLower.includes("เหล้า")) {
                    spicyText = '';
                }
                
                itemsLog.push(`• ${name}${spicyText ? ' ' + spicyText : ''} x ${qty}\nราคา ${totalPrice} บาท`);
            }
            formattedOrders = itemsLog.join('\n\n');
        } else if (typeof orders === 'string') {
            formattedOrders = orders.replace(/จาน/g, '').trim();
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

        const messageText = `📥 ออเดอร์ใหม่เข้าแล้วจ้า! 🔥🌶️\n\n` +
                            `${deliveryInfo}\n` +
                            `👤 ลูกค้า: คุณ ${customer}\n\n` +
                            `📝 [ รายการอาหาร ]\n` +
                            `${formattedOrders}\n\n` +
                            `💰 ยอดสุทธิรวม: ${totalCost} บาท\n` +
                            `================🔥`;

        // 🚀 สั่งรันระเบิดลูปยิงสลับกลุ่มตามโครงสร้าง LINE_BOT_CONFIGS
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