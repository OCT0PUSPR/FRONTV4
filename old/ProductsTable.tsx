import { useState } from 'react'

interface Product {
    id: number;
    name: string;
    default_code: string;
    qty_available: number;
    virtual_available: number;
    list_price: number;
    standard_price: number;
    image_1920: string;
    categ_id: string[];
    weight: number;
    sale_ok: boolean;
}

interface ProductsTableProps {
    products: Product[];
}

export function ProductsTable({ products }: ProductsTableProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    //Number of products per page
    const itemsPerPage = 5

    const filteredProducts = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.default_code && product.default_code.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    // Calculate pagination
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const currentProducts = filteredProducts.slice(startIndex, endIndex)

    // Reset to page 1 when search term changes
    const handleSearchChange = (value: string) => {
        setSearchTerm(value)
        setCurrentPage(1)
    }
    //Next page
    const handleNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1)
        }
    }
    //Previous page
    const handlePreviousPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1)
        }
    }

    //Open modal with product details
    const handleRowClick = (product: Product) => {
        setSelectedProduct(product)
        setIsModalOpen(true)
    }

    //Close modal
    const closeModal = () => {
        setIsModalOpen(false)
        setSelectedProduct(null)
    }

    return (
        <div>
            {/* Search Input */}
            <div style={{ marginBottom: '20px' }}>
                <input
                    type="text"
                    placeholder="Search by product name or SKU..."
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    style={{
                        width: '100%',
                        maxWidth: '400px',
                        padding: '10px 14px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#BCBCBC'}
                    onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
            </div>

            {/* Table */}
            <div style={{
                overflow: 'hidden',
            }}>
                <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '14px',
                }}>
                    <thead>
                        <tr style={{
                            borderBottom: '1px solidrgb(232, 232, 232)',
                        }}>
                            <th style={{
                                padding: '12px 16px',
                                textAlign: 'left',
                                fontWeight: '600',
                                color: '#374151',
                                width: '80px',
                            }}></th>
                            <th style={{
                                padding: '12px 16px',
                                textAlign: 'left',
                                fontWeight: '600',
                                color: '#374151',
                            }}>Product Name</th>
                            <th style={{
                                padding: '12px 16px',
                                textAlign: 'left',
                                fontWeight: '600',
                                color: '#374151',
                            }}>SKU</th>
                            <th style={{
                                padding: '12px 16px',
                                textAlign: 'left',
                                fontWeight: '600',
                                color: '#374151',
                            }}>List Price</th>
                            <th style={{
                                padding: '12px 16px',
                                textAlign: 'left',
                                fontWeight: '600',
                                color: '#374151',
                            }}>Available Quantity</th>
                            <th style={{
                                padding: '12px 16px',
                                textAlign: 'left',
                                fontWeight: '600',
                                color: '#374151',
                            }}>Status</th>
                            <th style={{
                                padding: '12px 16px',
                                textAlign: 'left',
                                fontWeight: '600',
                                color: '#374151',
                            }}>Category</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentProducts.length > 0 ? (
                            currentProducts.map((product, index) => (
                                <tr 
                                    key={product.id}
                                    onClick={() => handleRowClick(product)}
                                    style={{
                                        backgroundColor:  '#FFFFFF',
                                        borderBottom: index < currentProducts.length - 1 ? '1px solid #e5e7eb' : 'none',
                                        transition: 'background-color 0.2s',
                                        cursor: 'pointer',
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                                >
                                <td style={{
                                    padding: '14px 16px',
                                }}>
                                    {product.image_1920 ? (
                                        <div style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '6px',
                                            border: '1px solid rgb(188, 188, 188)',
                                            overflow: 'hidden',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            backgroundColor: '#fff',
                                        }}>
                                            <img 
                                                src={`data:image/webp;base64,${product.image_1920}`}
                                                alt={product.name}
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'contain',
                                                }}
                                            />
                                        </div>
                                    ) : (
                                        <div style={{
                                            width: '60px',
                                            height: '60px',
                                            backgroundColor: '#f3f4f6',
                                            borderRadius: '6px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#9ca3af',
                                            fontSize: '12px',
                                        }}>
                                            No img
                                        </div>
                                    )}
                                </td>
                                <td style={{
                                    padding: '14px 16px',
                                    fontWeight: '500',
                                    color: '#111827',
                                }}>{product.name}</td>
                                <td style={{
                                    padding: '14px 16px',
                                    color: '#6b7280',
                                }}>{product.default_code }</td>
                                <td style={{
                                    padding: '14px 16px',
                                    color: '#6b7280',
                                }}>L.E {product.list_price}</td>
                                    <td style={{
                                        padding: '14px 16px',
                                        color: '#6b7280',
                                    }}>{product.qty_available}</td>
                                    <td style={{
                                        padding: '14px 16px',
                                        color: '#6b7280',
                                    }}>{product.sale_ok ? 
                                    <div style={{
                                        backgroundColor: '#EFFCF3',
                                        padding: '4px 0px',
                                        border: '1px solid #0EBA54',
                                        borderRadius: '8px',
                                        color: '#0EBA54',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        textTransform: 'uppercase',
                                        display:'flex',
                                        alignItems:'center',
                                        gap:'8px',
                                        flexDirection:'row',
                                    }}>
                                        <div style={{marginLeft: '8px',width: '10px', height: '10px', backgroundColor: '#0EBA54', borderRadius: '50%'}}></div>
                                        Active
                                    </div> : 
                                    'Inactive'}</td>
                                    <td style={{
                                        padding: '14px 16px',
                                        color: '#6b7280',
                                    }}>{product.categ_id[1]}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td 
                                    colSpan={5} 
                                    style={{
                                        padding: '48px 16px',
                                        textAlign: 'center',
                                        color: '#9ca3af',
                                    }}
                                >
                                    {searchTerm ? `No products found matching "${searchTerm}"` : 'No products available'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {filteredProducts.length > 0 && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    marginTop: '16px',
                    padding: '12px 0',
                }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={handlePreviousPage}
                            disabled={currentPage === 1}
                            style={{
                                padding: '8px 16px',
                                fontSize: '14px',
                                fontWeight: '500',
                                border: '1px solid #e5e7eb',
                                borderRadius: '6px',
                                backgroundColor: currentPage === 1 ? '#f9fafb' : '#ffffff',
                                color: currentPage === 1 ? '#9ca3af' : '#374151',
                                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => {
                                if (currentPage !== 1) {
                                    e.currentTarget.style.backgroundColor = '#f9fafb'
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (currentPage !== 1) {
                                    e.currentTarget.style.backgroundColor = '#ffffff'
                                }
                            }}
                        >
                            Previous
                        </button>
                        <div style={{
                            padding: '8px 16px',
                            fontSize: '14px',
                            fontWeight: '500',
                            color: '#374151',
                            display: 'flex',
                            alignItems: 'center',
                        }}>
                            Page {currentPage} of {totalPages}
                        </div>
                        <button
                            onClick={handleNextPage}
                            disabled={currentPage === totalPages}
                            style={{
                                padding: '8px 16px',
                                fontSize: '14px',
                                fontWeight: '500',
                                border: '1px solid #e5e7eb',
                                borderRadius: '6px',
                                backgroundColor: currentPage === totalPages ? '#f9fafb' : '#ffffff',
                                color: currentPage === totalPages ? '#9ca3af' : '#374151',
                                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => {
                                if (currentPage !== totalPages) {
                                    e.currentTarget.style.backgroundColor = '#f9fafb'
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (currentPage !== totalPages) {
                                    e.currentTarget.style.backgroundColor = '#ffffff'
                                }
                            }}
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {/* Product Indormation Modal  */}
            {isModalOpen && selectedProduct && (
                <div 
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                    }}
                    onClick={closeModal}
                >
                    <div 
                        style={{
                            backgroundColor: 'white',
                            borderRadius: '12px',
                            maxWidth: '800px',
                            width: '90%',
                            maxHeight: '90vh',
                            overflow: 'auto',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '20px 24px',
                            borderBottom: '1px solid #e5e7eb',
                        }}>
                            <h2 style={{
                                fontSize: '20px',
                                fontWeight: '600',
                                color: '#111827',
                                margin: 0,
                            }}>Product Details</h2>
                            <button
                                onClick={closeModal}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '24px',
                                    cursor: 'pointer',
                                    color: '#6b7280',
                                    padding: '0',
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '6px',
                                    transition: 'background-color 0.2s',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                ×
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div style={{
                            display: 'flex',
                            gap: '32px',
                            padding: '24px',
                            flexDirection: window.innerWidth < 768 ? 'column' : 'row',
                        }}>
                            {/* Image */}
                            <div style={{
                                flex: '0 0 300px',
                                display: 'flex',
                                alignItems: 'flex-start',
                                justifyContent: 'center',
                            }}>
                                {selectedProduct.image_1920 ? (
                                    <img 
                                        src={`data:image/webp;base64,${selectedProduct.image_1920}`}
                                        alt={selectedProduct.name}
                                        style={{
                                            width: '100%',
                                            maxWidth: '300px',
                                            height: 'auto',
                                            borderRadius: '8px',
                                            border: '1px solid #e5e7eb',
                                            objectFit: 'contain',
                                        }}
                                    />
                                ) : (
                                    <div style={{
                                        width: '300px',
                                        height: '300px',
                                        backgroundColor: '#f3f4f6',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#9ca3af',
                                        fontSize: '16px',
                                    }}>
                                        No Image Available
                                    </div>
                                )}
                            </div>

                            {/* Details */}
                            <div style={{ flex: 1 }}>
                                <h3 style={{
                                    fontSize: '24px',
                                    fontWeight: '600',
                                    color: '#111827',
                                    marginTop: 0,
                                    marginBottom: '8px',
                                }}>{selectedProduct.name}</h3>
                                
                                {selectedProduct.default_code && (
                                    <p style={{
                                        color: '#6b7280',
                                        fontSize: '14px',
                                        marginTop: 0,
                                        marginBottom: '24px',
                                    }}>SKU: {selectedProduct.default_code}</p>
                                )}

                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '20px',
                                    marginTop: '24px',
                                }}>
                                    <div>
                                        <label style={{
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            color: '#6b7280',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                        }}>Product ID</label>
                                        <p style={{
                                            margin: '6px 0 0 0',
                                            fontSize: '16px',
                                            color: '#111827',
                                        }}>{selectedProduct.id}</p>
                                    </div>

                                    <div>
                                        <label style={{
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            color: '#6b7280',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                        }}>Category</label>
                                        <p style={{
                                            margin: '6px 0 0 0',
                                            fontSize: '16px',
                                            color: '#111827',
                                        }}>{selectedProduct.categ_id[1]}</p>
                                    </div>

                                    <div>
                                        <label style={{
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            color: '#6b7280',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                        }}>Available Quantity</label>
                                        <p style={{
                                            margin: '6px 0 0 0',
                                            fontSize: '16px',
                                            color: selectedProduct.qty_available > 0 ? '#059669' : '#dc2626',
                                            fontWeight: '600',
                                        }}>{selectedProduct.qty_available}</p>
                                    </div>

                                    <div>
                                        <label style={{
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            color: '#6b7280',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                        }}>Virtual Quantity</label>
                                        <p style={{
                                            margin: '6px 0 0 0',
                                            fontSize: '16px',
                                            color: '#111827',
                                        }}>{selectedProduct.virtual_available}</p>
                                    </div>

                                    <div>
                                        <label style={{
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            color: '#6b7280',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                        }}>List Price</label>
                                        <p style={{
                                            margin: '6px 0 0 0',
                                            fontSize: '18px',
                                            color: '#111827',
                                            fontWeight: '600',
                                        }}>L.E {selectedProduct.list_price}</p>
                                    </div>

                                    <div>
                                        <label style={{
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            color: '#6b7280',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                        }}>Cost Price</label>
                                        <p style={{
                                            margin: '6px 0 0 0',
                                            fontSize: '16px',
                                            color: '#111827',
                                        }}>L.E {selectedProduct.standard_price}</p>
                                    </div>

                                    <div>
                                        <label style={{
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            color: '#6b7280',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                        }}>Weight</label>
                                        <p style={{
                                            margin: '6px 0 0 0',
                                            fontSize: '16px',
                                            color: '#111827',
                                        }}>{selectedProduct.weight} kg</p>
                                    </div>

                                    <div>
                                        <label style={{
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            color: '#6b7280',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                        }}>Can be Sold</label>
                                        <p style={{
                                            margin: '6px 0 0 0',
                                            fontSize: '16px',
                                            color: selectedProduct.sale_ok ? '#059669' : '#dc2626',
                                            fontWeight: '600',
                                        }}>{selectedProduct.sale_ok ? 'Yes' : 'No'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}



