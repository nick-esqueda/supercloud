import { useState } from 'react';
import Modal from '.';
import LoginForm from '../LoginForm';


function LoginModal() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        className="btn btn--secondary--outline"
        onClick={() => setShowModal(true)}
      >
        log in
      </button>

      {showModal && (
        <Modal closeModal={() => setShowModal(false)}>
          <LoginForm />
        </Modal>
      )}
    </>
  );
}

export default LoginModal;