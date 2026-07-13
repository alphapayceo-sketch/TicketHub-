module.exports = () => {

  const random =
    Math.floor(
      Math.random() * 1000000
    );

  return `TICKET-${Date.now()}-${random}`;
};