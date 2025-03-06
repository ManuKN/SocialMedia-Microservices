const amqp = require("amqplib");
const logger = require("./logger");

let connection = null;
let channel = null;

const EXCHANGE_NAME = "facebook_events";

async function connectToRabbitMQ() {
  try {
    connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: false });
    logger.info("Connected to Rabbit MQ");
    return channel;
  } catch (e) {
    logger.error("Error connecting to RabbitMq");
  }
}

async function publishEvent(routingKey, message) {
  if (!channel) {
    await connectToRabbitMQ();
  }
  channel.publish(
    EXCHANGE_NAME,
    routingKey,
    Buffer.from(JSON.stringify(message))
  );
  logger.info(`Event published : ${routingKey}`);
}

async function consumeEvent(routingKey, callback) {
  if (!channel) {
    channel = await connectToRabbitMQ(); // 🔥 Assign the channel
  }

  const q = await channel.assertQueue("", { exclusive: true }); // Creates a temporary queue
  await channel.bindQueue(q.queue, EXCHANGE_NAME, routingKey); // Bind queue to exchange with routing key

  channel.consume(q.queue, (msg) => {
    if (msg !== null) {
      try {
        const content = JSON.parse(msg.content.toString()); // Parse message content
        callback(content); // Call the provided callback function
        channel.ack(msg); // Acknowledge message to remove it from the queue
      } catch (error) {
        logger.error("Error processing message:", error);
      }
    }
  });

  logger.info("Subscribed to event:", routingKey); // ✅ Fixed spelling
}


module.exports = { connectToRabbitMQ, publishEvent, consumeEvent };
