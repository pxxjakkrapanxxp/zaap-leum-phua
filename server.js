const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

app.use(cors());
app.use(express.json());

// 🔑 Token LINE OA ร้านแซ่บลืมผัวของพี่
const LINE_ACCESS_TOKEN = "D9ExQrK4/2l62hPuPvnrxJnsNUoRogzAJTYQL8Tzr3U38WBPwJcUf26DceTDkG+qNSuJBVEI5E6d6z4qBcr5VOkwwN3wwk8IeWRc/agLjJzKTrG6S4Nren2ZBV4K5P9GeUg45AOA8VBFFY4hHfquXQdB04t89/1O/w1cDnyilFU=";

// 🆔 รหัสกลุ่มของพี่
const LINE_TARGET_GROUP_ID = "Caf6de425fc6bacbf9afd71c27ffef7ea";

// ฟังก์ชันอัจฉริยะช่วยตรวจสอบและแนบราคาให้พ่อครัวดูปริมาณได้ถูกต้อง
function appendPriceToItem(itemText) {
    let text = itemText.trim();
    if (!text) return '';
    
    // ถ้าข้อความเดิมมีวงเล็บราคาระบุมาอยู่แล้ว ให้ส่งกลับไปเลย
    if (text.includes('บาท') || text.includes('บ.')) {
        return text;
    }

    // 1. กลุ่มเมนูแซลมอนและตำถาดใหญ่ (ราคา 350-299 บาท)
    if (text.includes('ตำถาดบกทะเลแซลมอน ใหญ่') || text.includes('(L)')) {
        return `${text} (350 บ.)`;
    }
    if (text.includes('แซลมอนไข่กุ้ง')) {
        return `${text} (299 บ.)`;
    }

    // 2. กลุ่มเมนูทะเลและเมนูพิเศษ (ราคา 150-180 บาท)
    if (text.includes('เหลารวมทะเล') || text.includes('ต้มแซ่บรวมมิตร (ไม่มีทะเล) (พิเศษ)')) {
        return `${text} (150 บ.)`;
    }

    // 3. กลุ่มอาหารจานเดียว / ของทอด / ตำปกติ (ราคา 60-80 บาท)
    if (text.includes('เนื้อแดดเดียว') || text.includes('ยำหนังหมูโบราณ')) {
        return `${text} (80 บ.)`;
    }
    if (text.includes('ตำข้าวโพด') || text.includes('ตำซั่ว')) {
        return `${text} (60 บ.)`;
    }
    if (text.includes('ข้าวไข่ดาว')) {
        return `${text} (50 บ.)`;
    }

    // ถ้าเป็นเมนูอื่นๆ นอกเหนือจากนี้ ให้ส่งข้อความเดิมออกไป
    return text;
}

// 🛍️ ด่านรับออเดอร์
app.post('/api/order', async (req, res) => {
    try {
        const { customer, table, orders, totalCost } = req.body;

        let formattedOrders = '';

        if (Array.isArray(orders)) {
            // กรณีหน้าร้านส่งมาเป็น Array วัตถุ
            formattedOrders = orders.map(item => {
                let nameWithPrice = appendPriceToItem(item.name);
                return `- ${nameWithPrice} x ${item.quantity} จาน`;
            }).join('\n');
        } else if (typeof orders === 'string') {
            // กรณีหน้าร้านส่งมาเป็นข้อความรวมยาวๆ (จากระบบเดิมของพี่)
            // ระบบจะนำมาแยกบรรทัดแล้วห้อยราคารายรายการให้อัตโนมัติครับ
            formattedOrders = orders.split('\n')
                .map(line => {
                    let cleanLine = line.replace(/^-\s*/, '').trim();
                    if (!cleanLine) return '';
                    return `- ${appendPriceToItem(cleanLine)}`;
                })
                .filter(line => line !== '')
                .join('\n');
        }

        // จัดรูปแบบข้อความส่งเข้า LINE
        const messageText = `🔥 มีออเดอร์ใหม่เข้าครัว! 🔥\n` +
                            `📌 หมายเลขโต๊ะ: ${table}\n` +
                            `👤 ชื่อลูกค้า: คุณ ${customer}\n` +
                            `-------------------------\n` +
                            `${formattedOrders}\n` +
                            `-------------------------\n` +
                            `💰 ยอดสุทธิ: ${totalCost} บาท`;

        // ส่งข้อความเข้ากลุ่ม LINE
        await axios.post('https://api.line.me/v2/bot/message/push', {
            to: LINE_TARGET_GROUP_ID,
            messages: [{ type: 'text', text: messageText }]
        }, {
            headers: {
                'Authorization': `Bearer ${LINE_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`✅ [SUCCESS] ส่งออเดอร์โต๊ะ ${table} โชว์ราคาต่อหน่วยเรียบร้อย!`);
        res.status(200).json({ status: 'success', message: 'ส่งออเดอร์สำเร็จ' });

    } catch (error) {
        console.error('❌ ข้อผิดพลาดฝั่งรับออเดอร์:', error.message);
        res.status(500).json({ status: 'error', message: 'เกิดข้อผิดพลาดภายในระบบ' });
    }
});

app.post('/callback', (req, res) => {
    res.sendStatus(200);
});

// ตรวจสอบตำแหน่งรันโฟลเดอร์ป้องกันเออร์เรอร์บน Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 [SERVER ONLINE] ระบบเปิดสแตนด์บายที่พอร์ต: ${PORT}`);
});